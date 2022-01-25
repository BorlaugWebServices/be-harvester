const debug = require("debug")("be-harvester:identity");

import _ from "lodash";

export default class Identity {

    private store;
    private api;

    constructor(store, api) {
        this.store = store;
        this.api = api;
    }

    /**
     * checks transaction with `identity` module and creates/updates a identity object
     */
        async process(transaction, _events, blockNumber, blockHash) {
        if (transaction.method.section !== 'identity') {
            throw new Error("Not an identity transaction");
        }

        if (transaction.method.method === 'registerDidFor') {
            debug('registerDidFor');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'Registered';
            });

            if (events.length > 0) {
                let event = events[0];
                let subject = event.event.data[1].toString();
                let controller = event.event.data[2].toString();
                let did = event.event.data[3].id.toString();

                return {
                    did,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash,
                    subject,
                    controller
                }
            } else {
                throw new Error(`Registered Event not found`);
            }
        } else if (transaction.method.method === 'registerDid') {
            debug('registerDid');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'Registered';
            });

            if (events.length > 0) {
                let event = events[0];
                let subject = event.event.data[1].toString();
                let controller = event.event.data[2].toString();
                let did = event.event.data[3].id.toString();

                return {
                    did,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash,
                    subject,
                    controller
                }
            } else {
                throw new Error(`Registered Event not found`);
            }
        } else if (['addDidProperties', 'removeDidProperties', 'manageControllers', 'authorizeClaimConsumers', 'revokeClaimConsumers',
            'authorizeClaimIssuers', 'revokeClaimIssuers', 'createCatalog', 'removeCatalog'].includes(transaction.method.method)) {
            debug(transaction.method.method);
            let did = transaction.method.args[1].id;

            return {
                did,
                tx_hash: transaction.hash
            }
        } else if (['makeClaim', 'attestClaim', 'revokeAttestation'].includes(transaction.method.method)) {
            debug(transaction.method.method);
            let did = transaction.method.args[1].id;

            return {
                did,
                tx_hash: transaction.hash
            }
        } else if (transaction.method.method === 'addDidsToCatalog') {
            debug(transaction.method.method);
            let dids = [];

            transaction.method.args[1].forEach(obj => {
                dids.push({
                    did: obj.id,
                    tx_hash: transaction.hash
                })
            });

            return dids;
        } else if (transaction.method.method === 'removeDidsFromCatalog') {
            debug(transaction.method.method);
            let dids = [];

            transaction.method.args[1].forEach(obj => {
                dids.push({
                    did: obj.id,
                    tx_hash: transaction.hash
                })
            });

            return dids;
        } else {
            // throw new Error("Method not recognized");
            debug("Method not recognized");
        }

    }
}
