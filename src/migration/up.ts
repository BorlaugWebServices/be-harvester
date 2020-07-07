const debug = require("debug")("be-harvester:Migration");

import {DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, Store, TTL_MIN, TTL_MAX} from "../config";

Store.DataStore(DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, TTL_MIN, TTL_MAX)
.then(async (store) => {
    await store.migration.up();
    debug("Migration Success");
    process.exit();
})
.catch(error => {
    //console.error("Migration Failed", error);
    debug("Migration Failed", error);
    process.exit();
});
