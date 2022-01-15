const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authController = require('./controllers/auth');
const expressLayouts = require('express-ejs-layouts');
const express = require('express');
const session = require('express-session');
const MongoStore = new require('connect-mongo');
const { client } = require('./session/client.js');
const app = express();
const port = process.env.PORT;
const bearerToken = require('express-bearer-token');

app.use(bearerToken());
app.use(express.static('public'));
app.use(expressLayouts);
app.set('layout', './layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    // You should actually store your JWT secret in your .env file - but to keep this example as simple as possible...
    secret: 'supersecret difficult to guess string',
    cookie: {},
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ client: client }),
  })
);

//app.use(csurf());

app.get('/', (req, res) => {
  let token = '123456789876543';
  if (req.session.id) token = req.session.accessToken;
});

app.post('/login-button', (req, res) => {
  req.session.token = req.body.accessToken.trim();

  res.send('Welcome');
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

//routes
const authRoutes = require('./routes/auth');

//Declare API category endpoints
app.use('/', authRoutes);

//clienti bağlama
client
  .connect()
  .then(() => {
    console.log('client bağlandı');
  })
  .catch((err) => {
    console.log('mongodb bağlanamadı', err);
  });

mongoose
  .connect(
    `${process.env.DB_PROTOCOL}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?${process.env.DB_PARAMS}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    app.listen(port, () => {
      console.log('API Listening to http://localhost:' + port);
    });
  })
  .catch((err) => {
    console.log('mongose connection failed', err);
  });

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Mongoose disconnected on app termination');
    process.exit(0);
  });
});

app.get('/server', (req, res) => {
  res.send('Hello');
});

//login sayfasını render edildi
app.get('/login', (req, res) => {
  res.render('login', { title: 'About Page' });
});
//login sayfasını render edildi
app.get('/register', (req, res) => {
  res.render('register', { title: 'About Page' });
});
