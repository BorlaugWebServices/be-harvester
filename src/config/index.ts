const dotenv = require('dotenv');

let path = `${__dirname}/../../.env`;

dotenv.config({path: path});

export const ADDAX_ADDRESS = process.env.ADDAX_ADDRESS;
export const RPC_PORT = process.env.RPC_PORT;
export const REDIS_HOSTS = process.env.REDIS_HOSTS.split(',');
export const REDIS_PORTS = process.env.REDIS_PORTS.split(',');
export const TTL = process.env.CACHE_EXPIRY || 7776000;
export const DB_TYPE = process.env.DB_CONNECTION_TYPE;
export const DB_URL = process.env.DB_CONNECTION_URL;

