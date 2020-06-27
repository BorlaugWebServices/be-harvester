const debug = require("debug")("be-harvester:identity");

import _ from "lodash";
import {hexToString} from '@polkadot/util';

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
        } else if (transaction.method.method === 'registerDidFor') {
            debug('registerDidFor');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'Registered';
            });

            //debug('events :', JSON.stringify(events));

            if (events.length > 0) {
                let event = events[0];
                let subject = event.event.data[0].toString();
                let controller = event.event.data[1].toString();
                let did = event.event.data[2].id.toString();
                let properties = [];
                let claims = [];
                let attestations = [];
                let identity = await this.api.query.identity.didInfo(did);

                // debug('subject :', subject);
                // debug('controller :', controller);
                identity.properties.forEach(prop => {
                    let obj = prop.toJSON();
                    let name = hexToString(obj.name);
                    let fact = null;

                    if (obj.fact.Text) {
                        fact = hexToString(obj.fact.Text);
                    } else if (obj.fact.Bool!== null) {
                        fact = obj.fact.Bool;
                    } else if (obj.fact.U8) {
                        fact = obj.fact.U8;
                    }
                    //debug("property :", {name, fact});
                    properties.push({
                        name,
                        fact
                    })
                });

                return {
                    did,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash,
                    subject,
                    controller,
                    properties: JSON.stringify(properties),
                    claims: JSON.stringify(claims),
                    attestations: JSON.stringify(attestations)
                }
            } else {
                throw new Error(`Registered Event not found`);
            }
        } else if (transaction.method.method === 'updateDid') {
            debug('updateDid');
        } else {
            throw new Error("Method not recognized");
        }
    }
}