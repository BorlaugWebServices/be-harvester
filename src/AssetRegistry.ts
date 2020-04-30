import _ from "lodash";

export default class AssetRegistry {

    private store;

    constructor(store) {
        this.store = store;
    }

    /**
     * checks transaction with `assetRegistry` module and creates/updates a lease object
     */
    async process(transaction, _events, blockNumber, blockHash) {
        if (transaction.method.section !== 'assetRegistry') {
            throw new Error("Not an assetRegistry transaction");
        } else if (transaction.method.method === 'newLease') {
            console.log("new lease");

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'LeaseCreated';
            });
            if (events.length > 0) {
                let event = events[0];
                let leaseid = event.event.data[0];
                let arg = transaction.method.args[0];
                return {
                    id: leaseid,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash,
                    contractNumber: arg.contract_number,
                    lessor: JSON.stringify(arg.lessor),
                    lessee: JSON.stringify(arg.lessee),
                    allocations: JSON.stringify(arg.allocations),
                    effectiveTs: Number(arg.effective_ts.replace(/,/g, '')),
                    expiryTs: Number(arg.expiry_ts.replace(/,/g, ''))
                };
            } else {
                throw new Error(`LeaseCreated Event not found`);
            }
        }

        // else if (transaction.method.method === 'voidLease') {
        //     console.log("void lease");
        //     let leaseId = transaction.method.args[1];
        //     let leaseActivityKey = `lease:${leaseId}:activities`;
        //     await lpush(leaseActivityKey, transaction.hash);
        // } else {
        //     throw new Error("Method not recognized");
        // }
    }
}