import dotenv from 'dotenv';

dotenv.config();

const REDIS_SERVER = process.env.REDIS_SERVER.split(":");

export const ADDAX_ADDRESS = process.env.ADDAX_ADDRESS;
export const RPC_PORT = process.env.RPC_PORT;
export const REDIS_HOST = REDIS_SERVER[0];
export const REDIS_PORT = REDIS_SERVER[1];
export const TTL_MIN = process.env.TTL_MIN || 3600;
export const TTL_MAX = process.env.TTL_MAX || 31556952;
export const DB_TYPE = process.env.DATABASE_TYPE;
export const DB_URL = `${process.env.DATABASE_SERVER}/${process.env.DATABASE}`;




