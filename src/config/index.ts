const dotenv = require('dotenv');
const DataStore = require('be-datastore')

let path = `${__dirname}/../../.env`;

dotenv.config({path: path});

export const ADDAX_ADDRESS = process.env.ADDAX_ADDRESS;
export const RPC_PORT = process.env.RPC_PORT;
export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = process.env.REDIS_PORT;
export const TTL_MIN = process.env.TTL_MIN || 3600;
export const TTL_MAX = process.env.TTL_MAX || 7776000;
export const DB_TYPE = process.env.DB_CONNECTION_TYPE;
export const DB_URL = process.env.DB_CONNECTION_URL;
export const TYPES = JSON.parse(process.env.TYPES);
export const Store = DataStore;


