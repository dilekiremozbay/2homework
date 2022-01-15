const User = require('../models/User');
const jwt = require('jsonwebtoken');
const validation = require('../helpers/validation');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

const login = async (req, res) => {
  try {
    const { error } = validation.loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: 400,
        message: 'INPUT_ERRORS',
        errors: error.details,
        original: error._original,
      });
    }

    const user = await User.findOne({ username: req.body.username });

    if (!user) {
      return res
        .status(401)
        .json({ message: 'incorrect username or password' });
    }

    // Check if the username is correct
    // Check if the password correct
    const validatePassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!validatePassword) {
      return res
        .status(401)
        .json({ message: 'incorrect username or password' });
    }

    const browserDetails = { userAgent: req.headers['user-agent'] };

    // Generate Access & Refresh Token
    const accessToken = jwt.sign(
      {
        _id: user.id,
        browserDetails,
      },
      process.env.SECRET_ACCESS_TOKEN,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = jwt.sign(
      {
        _id: user.id,
      },
      process.env.SECRET_REFRESH_TOKEN,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    const refreshTokenResult = await addRefreshToken(user, refreshToken);

    if (!refreshTokenResult) {
      return res
        .status(500)
        .json({ error: { status: 500, message: 'SERVER_ERROR' } });
    }

    //Tarayıcı bilgileri kaydedildi//
    req.session.browserDetails = browserDetails;

    /*  res.status(200).json({
      success: {
        status: 200,
        message: 'LOGIN_SUCCESS',
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    });
    */

    res.redirect('/users');
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: { status: 500, message: 'SERVER ERROR' } });
  }
};
const register = async (req, res) => {
  try {
    const { error } = validation.registerSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      res.status(400).json({
        status: 400,
        message: 'INPUT_ERRORS',
        errors: error.details,
        original: error._original,
      });
    } else {
      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      // Create new User instance
      const user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        username: req.body.username,
        password: hashedPassword,
        security: {
          tokens: [],
        },
      });

      // Attempt to save the user in database
      await user.save();

      // Generate Access & Refresh Token
      const accessToken = jwt.sign(
        {
          _id: user.id,
          username: user.username,
        },
        process.env.SECRET_ACCESS_TOKEN,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
      );
      const refreshToken = jwt.sign(
        {
          _id: user.id,
          username: user.username,
        },
        process.env.SECRET_REFRESH_TOKEN,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
      );

      // Assign the token to user and save
      await User.updateOne(
        { username: user.username },
        {
          $push: {
            'security.tokens': {
              refreshToken: refreshToken,
              createdAt: new Date(),
            },
          },
        }
      );
      /*
      res
        .status(200)
        .header()
        .json({
          success: {
            status: 200,
            message: 'REGISTER_SUCCESS',
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          },
        });
        */
      res.redirect('/login');
    }
  } catch (err) {
    console.log(err);
    let errorMessage;

    if (err.keyPattern.username === 1) {
      errorMessage = 'username_EXISTS';
    } else {
      errorMessage = err;
    }

    res.status(400).json({ error: { status: 400, message: errorMessage } });
  }
};

const token = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;

    // Verify if the token is valid - if not, don't authorise, ask to re-authenticate
    try {
      const decodeRefreshToken = jwt.verify(
        refreshToken,
        process.env.SECRET_REFRESH_TOKEN
      );
      const user = await User.findOne({
        username: decodeRefreshToken.username,
      });
      const existingRefreshTokens = user.security.tokens;

      // Check if refresh token is in document
      if (
        existingRefreshTokens.some(
          (token) => token.refreshToken === refreshToken
        )
      ) {
        // Generate new Access Token
        const accessToken = jwt.sign(
          {
            _id: user.id,
          },
          process.env.SECRET_ACCESS_TOKEN,
          { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );

        // Send new Access Token
        res.status(200).json({
          success: {
            status: 200,
            message: 'ACCESS_TOKEN_GENERATED',
            accessToken: accessToken,
          },
        });
      } else {
        res
          .status(401)
          .json({ error: { status: 401, message: 'INVALID_REFRESH_TOKEN' } });
      }
    } catch (err) {
      res
        .status(401)
        .json({ error: { status: 401, message: 'INVALID_REFRESH_TOKEN' } });
    }
  } catch (err) {
    res.status(400).json({ error: { status: 400, message: 'BAD_REQUEST' } });
  }
};

const test = async (req, res) => {
  try {
    const newUser = new User({
      username: 'test123',
      password: 'test',
      firstName: 'Jon',
      lastName: 'Doe',
      security: {
        tokens: null,
      },
    });

    await newUser.save();
    res.send(newUser);
  } catch (err) {
    res.send(err);
  }
};

const addRefreshToken = async (user, refreshToken) => {
  try {
    const existingRefreshTokens = user.security.tokens;

    // Check if there less than 5
    if (existingRefreshTokens.length < 5) {
      await User.updateOne(
        { username: user.username },
        {
          $push: {
            'security.tokens': {
              refreshToken: refreshToken,
              createdAt: new Date(),
            },
          },
        }
      );
    } else {
      // Otherwise, remove the last token
      await User.updateOne(
        { username: user.username },
        {
          $pull: {
            'security.tokens': {
              _id: existingRefreshTokens[0]._id,
            },
          },
        }
      );

      // Push the new token
      await User.updateOne(
        { username: user.username },
        {
          $push: {
            'security.tokens': {
              refreshToken: refreshToken,
              createdAt: new Date(),
            },
          },
        }
      );
    }
    return true;
  } catch (err) {
    return false;
  }
};

function authorizer(req, res, next) {
  console.log('authorization token', req.token);
  jwt.verify(
    req.token,
    process.env.SECRET_ACCESS_TOKEN,
    function (err, decoded) {
      console.log('verify result', { err, decoded, session: req.session });
      if (err) {
        return res.status(401).json({ message: err.message });
      }
      if (
        req.session.browserDetails.userAgent !==
        decoded.browserDetails.userAgent
      ) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      req.token = decoded;
      next();
    }
  );
}

async function me(req, res) {
  console.log('req.token', req.token);
  const user = await User.findOne({ _id: req.token._id });
  if (!user) {
    return res.status(401).json({ message: 'Account deleted' });
  }
  res.json(cleanUserObject(user));
}

async function findAllUsers(req, res) {
  let users = await User.find();
  users = users.map(cleanUserObject);
  res.json(users);
}

function cleanUserObject(user) {
  return _.pick(user, ['_id', 'username', 'firstName', 'lastName']);
}

module.exports = { test, login, register, token, me, authorizer, findAllUsers };
