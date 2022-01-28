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
        let event = _events[0];
        if (event.meta.name.toString() === 'ProcessCreated') {
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
        }else {
            let sequence_id = Number(event.event.data[4].toString());

            return {
                sequence_id,
                tx_hash: transaction.hash
            }
        }
    }

}
