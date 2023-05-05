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
        let catalogCreations = [], others = [];
        _events.forEach(event=> {
            if (event.meta.name.toString() === 'CatalogCreated') {
                let caller = event.event.data[0].toString();
                let controller = event.event.data[1].toString();
                let id = event.event.data[2].toString();
                catalogCreations.push({
                    id,
                    caller,
                    controller,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash
                })
            }else if((['CatalogRemoved', 'CatalogDidsAdded', 'CatalogDidsRemoved']).includes(event.meta.name.toString())){
                let catalog_id = event.event.data[2].toString();
                others.push({
                    catalog_id,
                    tx_hash: transaction.hash
                })
            } else{
                debug("Method not recognized");
            }
        })

        return catalogCreations.length > 0 ? catalogCreations : others
    }
}
