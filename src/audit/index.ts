const debug = require("debug")("be-harvester:audit");

import _ from "lodash";
import {hexToString} from '@polkadot/util';

export default class Audit {

    private store;
    private api;

    constructor(store, api) {
        this.store = store;
        this.api = api;
    }

    /**
     * checks transaction with `audit` module and creates/updates a identity object
     */
    async process(transaction, _events, blockNumber, blockHash) {
        if (transaction.method.section !== 'audit') {
            throw new Error("Not an identity transaction");
        }

        debug(transaction.method.method);

        if (transaction.method.method === 'registerDidFor') {
            debug('registerDidFor');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'Registered';
            });

            if (events.length > 0) {
                let event = events[0];
                let subject = event.event.data[0].toString();
                let controller = event.event.data[1].toString();
                let did = event.event.data[2].id.toString();
                let properties = this.getProperties(transaction.method.args[1]);
                let claims = [];
                let attestations = [];

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
        } else if (transaction.method.method === 'registerDid') {
            debug('registerDid');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'Registered';
            });

            if (events.length > 0) {
                let event = events[0];
                let subject = event.event.data[0].toString();
                let controller = event.event.data[1].toString();
                let did = event.event.data[2].id.toString();
                let properties = this.getProperties(transaction.method.args[0]);
                let claims = [];
                let attestations = [];

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
        } else if (['updateDid', 'replaceDid', 'manageControllers', 'authorizeClaimConsumers', 'revokeClaimConsumers',
            'authorizeClaimIssuers', 'revokeClaimIssuers', 'createCatalog', 'removeCatalog'].includes(transaction.method.method)) {
            debug(transaction.method.method);
            let did = transaction.method.args[0].id;

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

            transaction.method.args[2].forEach(obj => {
                dids.push({
                    did: obj[0].id,
                    tx_hash: transaction.hash
                })
            });

            return dids;
        } else if (transaction.method.method === 'removeDidsFromCatalog') {
            debug(transaction.method.method);
            let dids = [];

            transaction.method.args[2].forEach(obj => {
                dids.push({
                    did: obj.id,
                    tx_hash: transaction.hash
                })
            });

            return dids;
        } else {
            throw new Error("Method not recognized");
        }

    }

    private getProperties(args) {
        let properties = [];

        if(args && Array.isArray(args)){
            args.forEach(obj => {
                // debug(obj);
                let name = hexToString(obj.name);
                let fact = null;

                if (obj.fact.Text) {
                    fact = hexToString(obj.fact.Text);
                } else if (obj.fact.Bool !== null) {
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
        }

        return properties;
    }
}