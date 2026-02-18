import Debug from 'debug';
import {DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, TTL_MAX, TTL_MIN} from "#config";
import {DataStore} from "be-datastore";

const debug = Debug('be-datastore:Rollback');

export default async () => {
  try {
    const store = new DataStore(DB_TYPE, DB_URL, REDIS_HOST, Number(REDIS_PORT), Number(TTL_MIN), Number(TTL_MAX));
    await store.connect();
    await store.migration.down();
    debug("Rollback Success");
    process.exit();
  } catch (error) {
    //console.error("Rollback Failed", error);
    debug("Rollback Failed", error);
    process.exit();
  }
};
