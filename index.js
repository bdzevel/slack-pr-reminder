const dotenv = require('dotenv');

dotenv.config();

const handler = require('./execution-handler');

handler.execute();
