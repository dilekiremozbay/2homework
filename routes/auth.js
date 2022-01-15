const express = require('express');
const authController = require('../controllers/auth');

// API Middleware
const rateLimiter = require('../helpers/rateLimiter');
const verifyToken = require('../helpers/verifyToken');

// Router initialisation
const router = express.Router();

// Routes
router.get('/test', [rateLimiter(1, 2), verifyToken], authController.test);

// [POST] Login
router.post('/login', authController.login);

// [POST] Register
router.post('/register', authController.register);

// [POST] Token
router.post('/token', authController.token);

//[GET] me
router.get('/me', authController.authorizer, authController.me);

//[GET] users
router.get('/users', authController.findAllUsers);

module.exports = router;
