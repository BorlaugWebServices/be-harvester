const debug = require("debug")("be-harvester:Migration");

import {DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS, Store, TTL} from "./config";

Store.DataStore(DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS, TTL)
.then(async (store) => {
    await store.migration.up();
    //console.log("Migration Success");
    debug("Migration Success");
    process.exit();
})
.catch(error => {
    //console.error("Migration Failed", error);
    debug("Migration Failed", error);
    process.exit();
});
