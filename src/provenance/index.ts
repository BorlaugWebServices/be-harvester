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
        if (transaction.method.section !== 'provenance') {
            throw new Error("Not an provenance transaction");
        }

        if (transaction.method.method === 'createSequence') {
            debug('createSequence');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'SequenceCreated';
            });

            if (events.length > 0) {
                let event = events[0];
                let registry = event.event.data[0];
                let template = event.event.data[1];
                let id = event.event.data[2];
                let name = transaction.method.args[3];
                let sequence_creator = transaction.method.args[0].id;

                return {
                    id,
                    name,
                    registry,
                    template,
                    sequence_creator,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash
                }
            } else {
                throw new Error(`SequenceCreated Event not found`);
            }
        } else if (transaction.method.method === 'createSequenceStep') {
            debug(transaction.method.method);
            let sequence_id = Number(transaction.method.args[4]);

            return {
                sequence_id,
                tx_hash: transaction.hash
            }
        } else if (['updateSequence', 'removeSequence'].includes(transaction.method.method)) {
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