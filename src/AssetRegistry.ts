import {lpush, mget, set} from "./db";
import _ from "lodash";

export default class AssetRegistry {

    /**
     * checks transaction with `assetRegistry` module and creates/updates a lease object
     */
    async process(transaction, blockNumber,blockHash) {
        if (transaction.method.section !== 'assetRegistry') {
            throw new Error("Not an assetRegistry transaction");
        } else if (transaction.method.method === 'newLease') {
            console.log("new lease");
            let events = await mget(_.map(transaction.events, (e) => {
                return `evn:${e}`
            }));
            events = _.map(events, JSON.parse);
            events = _.filter(events, (e) => {
                return e.meta.name === 'LeaseCreated'
            });
            if (events.length > 0) {
                let event = events[0];
                let leaseid = event.event.data[0];
                let lease = {
                    ...transaction.method.args[0],
                    lease_id: event.event.data[0],
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash
                };
                await set(`lease:${leaseid}`, JSON.stringify(lease));
            } else {
                throw new Error(`LeaseCreated Event not found`);
            }
        } else if (transaction.method.method === 'voidLease') {
            console.log("void lease");
            let leaseId = transaction.method.args[1];
            let leaseActivityKey = `lease:${leaseId}:activities`;
            await lpush(leaseActivityKey, transaction.hash);
        } else {
            throw new Error("Method not recognized");
        }
    }
}