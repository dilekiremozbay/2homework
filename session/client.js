const dotenv = require('dotenv');
dotenv.config();
const { MongoClient } = require('mongodb');
const { apiDescriptor } = require('prettier');

const client = new MongoClient(
  (CONNECTIONSTRING = 'mongodb://localhost:27017/homework2')
);

//(process.env.CONNECTIONSTRING);
exports.client = client;
console.log('connection string');
