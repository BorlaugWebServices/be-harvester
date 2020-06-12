const debug = require("debug")("be-harvester:rpc");
const jayson = require('jayson');
import BlockProcessor from "./BlockProcessor";
import {DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS, Store, TTL} from "./config";

const blockProcessor = new BlockProcessor();

export const server = jayson.server({
    syncBlock: async function ({blockNumber}, callback) {
        let block = null;
        try {
            debug(`Block %d sync request`, blockNumber);
            block = await blockProcessor.getBlock(blockNumber);
        } catch (e) {
            //console.error(`${blockNumber} Not Found`);
            debug(`Block %d not found`);
        } finally {
            callback(null, block);
        }
    },
    cleanup: async function ({blockNumber}, callback) {
        try {
            if (!this.store) {
                this.store = await Store.DataStore(DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS, TTL);
            }

            await this.store.cleanup();

            callback(null, true);
        } catch (e) {
            //console.error(e);
            debug(e);
            callback(null, false);
        }
    }
});