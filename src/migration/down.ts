const debug = require("debug")("be-harvester:Rollback");

import {DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, Store, TTL_MIN, TTL_MAX} from "../config";

Store.DataStore(DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, TTL_MIN, TTL_MAX)
.then(async (store) => {
    await store.migration.down();
    debug("Rollback Success");
    process.exit();
})
.catch(error => {
    //console.error("Rollback Failed", error);
    debug("Rollback Failed", error);
    process.exit();
});
