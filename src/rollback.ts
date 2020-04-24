import {DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS, Store, TTL} from "./config";

Store.DataStore(DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS, TTL)
.then(async (store) => {
    await store.migration.down();
    console.log("Rollback Success");
    process.exit();
})
.catch(error => {
    console.error("Rollback Failed", error);
    process.exit();
});
