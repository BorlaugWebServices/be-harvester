const debug = require("debug")("watcher:db");

import {REDIS_PORTS, REDIS_HOSTS, DB_TYPE, DB_URL} from "../config";

const {promisify} = require("util");
const RedisClient = require("redis");
const RedisClustr = require("redis-clustr");

const servers = [];
// const client = redis.createClient(REDIS_PORT, REDIS_HOST, {});

if (REDIS_HOSTS.length !== REDIS_PORTS.length) {
    throw new Error("Redis cluster config mismatch");
} else {
    for (let i = 0; i < REDIS_HOSTS.length; i++) {
        servers.push({host: REDIS_HOSTS[i], port: REDIS_PORTS[i]})
    }
}

const client = new RedisClustr({
    servers: servers,
    createClient: function (port, host) {
        // this is the default behaviour
        return RedisClient.createClient(port, host);
    }
});

client.on('error', (error) => {
    console.log('error %o', error.message);
});
client.on('connectionError', (error) => {
    console.log('connectionError %o', error.message);
});
client.on('connect', () => {
    console.log('Successfully connected to redis');
});
client.on('fullReady', () => {
    console.log('Successfully connected to redis and ready');
});

export const set = promisify(client.set).bind(client);
export const lpush = promisify(client.lpush).bind(client);
export const zadd = promisify(client.zadd).bind(client);
export const publish = promisify(client.publish).bind(client);
export const del = promisify(client.del).bind(client);
export const _keys = promisify(client.keys).bind(client);
export const mget = promisify(client.mget).bind(client);

export const knex = require('knex')({client: DB_TYPE, connection: DB_URL, debug: false});
