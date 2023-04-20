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
        debug("All Events: ", _events);
        debug("transaction: ", transaction);
        if( transaction.method.method === 'registerDidForBulk'){
            let dids = [];
            _events.forEach(event=> {
                if (event.meta.name.toString() === 'Registered') {
                    let subject = event.event.data[1].toString();
                    let controller = event.event.data[2].toString();
                    let did = event.event.data[3].id.toString();
                    dids.push({
                        did,
                        blockNumber,
                        blockHash,
                        extrinsicHash: transaction.hash,
                        subject,
                        controller
                    })
                }
            });
            return  dids;
        }
        let event = _events[0];
        debug("Identity - process: ", event.event.toHuman());
        if (event.meta.name.toString() === 'Registered') {
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
        }else if(transaction.method.method === 'registerDidForBulk'){
            debug('registerDidForBulk');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'Registered';
            });
            debug(events)

            if (events.length > 0) {
                let returnEvents = [];
                events.forEach(event=> {
                    returnEvents.push({
                        did: event.event.data[3].id.toString(),
                        blockNumber,
                        blockHash,
                        extrinsicHash: transaction.hash,
                        subject: event.event.data[1].toString(),
                        controller: event.event.data[2].toString()
                    })
                });
                return returnEvents;
            } else {
                throw new Error(`registerDidForBulk Event not found`);
            }
        }else if((['DidPropertiesAdded', 'DidPropertiesRemoved', 'DidControllerUpdated', 'ClaimConsumersAuthorized', 'ClaimConsumersRevoked', 'ClaimIssuersAuthorized', 'ClaimIssuersRevoked', 'ClaimMade']).includes(event.meta.name.toString())){
            let did = event.event.data[2].id.toString();

            return {
                did,
                tx_hash: transaction.hash
            }
        }else if((['ClaimAttested', 'ClaimAttestationRevoked']).includes(event.meta.name.toString())){
            let did = event.event.data[1].id.toString();

            return {
                did,
                tx_hash: transaction.hash
            }
        }
        else {
            // throw new Error("Method not recognized");
            debug("Method not recognized");
        }

    }

    async getCatalogObj(transaction, _events, blockNumber, blockHash) {
        let event = _events[0];
        debug("Identity - getCatalogObj: ", event.event.toHuman())
        if (event.meta.name.toString() === 'CatalogCreated') {
            let caller = event.event.data[0].toString();
            let controller = event.event.data[1].toString();
            let id = event.event.data[2].toString();

            return {
                id,
                caller,
                controller,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }

        }else if((['CatalogRemoved', 'CatalogDidsAdded', 'CatalogDidsRemoved']).includes(event.meta.name.toString())){
            let catalog_id = event.event.data[2].toString();

            return {
                catalog_id,
                tx_hash: transaction.hash
            }
        } else{
            debug("Method not recognized");
        }

    }
}
