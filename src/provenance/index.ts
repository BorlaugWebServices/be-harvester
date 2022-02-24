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

    async getRegistryObj(transaction, _events, blockNumber, blockHash) {
        let event = _events[0];
        debug("Provenance - getRegistryObj: ", event.event.toHuman())
        if (event.meta.name.toString() === 'RegistryCreated') {
            let creator = event.event.data[0].toString();
            let creator_group = event.event.data[1].toString();
            let id = event.event.data[2].toString();

            return {
                id,
                creator,
                creator_group,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }

        }else if((['RegistryUpdated', 'RegistryRemoved']).includes(event.meta.name.toString())){
            let registry_id = event.event.data[2].toString();

            return {
                registry_id,
                tx_hash: transaction.hash
            }
        } else{
            debug("Method not recognized");
        }

    }

    async getDefinitionObj(transaction, _events, blockNumber, blockHash) {
        let event = _events[0];
        debug("Provenance - getDefinitionObj: ", event.event.toHuman())
        if (event.meta.name.toString() === 'DefinitionCreated') {
            let creator = event.event.data[0].toString();
            let creator_group = event.event.data[1].toString();
            let id = event.event.data[3].toString();
            let registry_id = event.event.data[2].toString();

            return {
                id,
                registry_id,
                creator,
                creator_group,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }

        }else if((['DefinitionSetActive', 'DefinitionSetInactive', 'DefinitionRemoved', 'DefinitionStepUpdated']).includes(event.meta.name.toString())){
            let definition_id = event.event.data[3].toString();

            return {
                definition_id,
                tx_hash: transaction.hash
            }
        } else{
            debug("Method not recognized");
        }

    }

}
