const debug = require("debug")("watcher:rpc");
const jayson = require('jayson');
import BlockProcessor from "./BlockProcessor";
import {del, _keys} from "./db";

const blockProcessor = new BlockProcessor();

export const server = jayson.server({
    syncBlock: async function ({blockNumber}, callback) {
        let block = null;
        try {
            block = await blockProcessor.getBlock(blockNumber);
        } catch (e) {
            console.log(`${blockNumber} Not Found`);
        } finally {
            callback(null, block);
        }
    },
    cleanup: async function ({blockNumber}, callback) {
        try {
            await del(`lease.keys`);
            await del(`transaction.keys`);
            await del(`inherent.keys`);
            await del(`event.keys`);
            await del(`log.keys`);
            await del(`block.keys`);

            let keys = await _keys("lease:[0-9]");
            console.log('Leases to be deleted', keys);
            let count = await del(keys);
            console.log('%d Leases deleted', count);

            keys = await _keys("lease:[0-9]:activities");
            console.log('Lease activities to be deleted', keys);
            count = await del(keys);
            console.log('%d Lease activities deleted', count);

            keys = await _keys("0x*");
            console.log('Transactions to be deleted', keys);
            count = await del(keys);
            console.log('%d Transactions deleted', count);

            keys = await _keys("0x*");
            console.log('Transactions to be deleted', keys);
            count = await del(keys);
            console.log('%d Transactions deleted', count);

            keys = await _keys("inh:*");
            console.log('Inherents to be deleted', keys);
            count = await del(keys);
            console.log('%d Inherents deleted', count);

            keys = await _keys("evn:*");
            console.log('Events to be deleted', keys);;
            count = await del(keys);
            console.log('%d Events deleted', count);

            keys = await _keys("log:*");
            console.log('Logs to be deleted', keys);
            count = await del(keys);
            console.log('%d Logs deleted', count);

            keys = await _keys("block:*");
            console.log('Blocks to be deleted', keys);
            count = await del(keys);
            console.log('%d Blocks deleted', count);

            callback(null, count);
        } catch (e) {
            console.log(e);
            callback(null, 0);
        }
    }
});