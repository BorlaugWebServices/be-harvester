const debug = require("debug")("be-harvester:provenance");

import _ from "lodash";
import {hexToString} from '@polkadot/util';

export default class Provenance {

    private store;
    private api;

    constructor(store, api) {
        this.store = store;
        this.api = api;
    }

    /**
     * checks transaction with `provenance` module and creates/updates a provenance object
     */
    async process(transaction, _events, blockNumber, blockHash) {
        debug("In Provenance -  process:", transaction.method.method);
        if (transaction.method.section !== 'provenance') {
            throw new Error("Not an provenance transaction");
        }

        if (transaction.method.method === 'createProcess') {
            debug('createProcess');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'ProcessCreated';
            });
            // debug("In Provenance - events: ", events)

            if (events.length > 0) {
                let event = events[0];
                debug("In Provenance - events: ", event.event.data.toHuman())
                debug("In Provenance - transaction: ", transaction.method.args)
                let registry = Number(event.event.data[2].toString());
                let template = Number(event.event.data[3].toString());
                let id = Number(event.event.data[4].toString());
                let name = transaction.method.args[2].toString();
                let sequence_creator = event.event.data[0].toString();
                let sequence_creator_group = event.event.data[1].toString();

                return {
                    id,
                    name,
                    registry,
                    template,
                    sequence_creator,
                    sequence_creator_group,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash
                }
            } else {
                throw new Error(`ProcessCreated Event not found`);
            }
        } else if (transaction.method.method === 'attestProcessStep') {
            debug(transaction.method.method);
            let sequence_id = Number(transaction.method.args[2]);

            return {
                sequence_id,
                tx_hash: transaction.hash
            }
        } else if (['updateProcess', 'removeProcess'].includes(transaction.method.method)) {
            debug(transaction.method.method);
            let sequence_id = Number(transaction.method.args[2]);

            return {
                sequence_id,
                tx_hash: transaction.hash
            }
        } else {
            // throw new Error("Method not recognized");
            debug("Method not recognized");
        }
    }

}
