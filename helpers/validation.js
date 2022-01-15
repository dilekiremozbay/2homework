const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().min(4).max(25),
  password: Joi.string().min(6).max(255),
  firstName: Joi.string().min(3).max(25),
  lastName: Joi.string().min(3).max(25),
});

const loginSchema = Joi.object({
  username: Joi.string().min(4).max(25),
  password: Joi.string().min(6).max(255),
});

module.exports = { registerSchema, loginSchema };
