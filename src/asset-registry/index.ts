const debug = require("debug")("be-harvester:asset-registry");

export default class AssetRegistry {

    private store;
    private api;

    constructor(store, api) {
        this.store = store;
        this.api = api;
    }

    async getRegistryObj(transaction, _events, blockNumber, blockHash) {
        let event = _events[0];
        debug("Asset-Registry - getRegistryObj: ", event.event.toHuman())
        if (event.meta.name.toString() === 'RegistryCreated') {
            let owner = event.event.data[0].id.toString();
            let id = event.event.data[1].toString();

            return {
                id,
                owner,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }

        }else if((['RegistryRenamed', 'RegistryDeleted']).includes(event.meta.name.toString())){
            let registry_id = event.event.data[1].toString();

            return {
                registry_id,
                tx_hash: transaction.hash
            }
        } else{
            debug("Method not recognized");
        }
    }

    async getAssetObj(transaction, _events, blockNumber, blockHash) {
        let event = _events[0];
        debug("Asset-Registry - getAssetObj: ", event.event.toHuman())
        if (event.meta.name.toString() === 'AssetCreated') {
            let registry_id = event.event.data[0].toString();
            let id = event.event.data[1].toString();

            return {
                id,
                registry_id,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }

        }else if((['AssetUpdated', 'AssetDeleted']).includes(event.meta.name.toString())){
            let asset_id = event.event.data[1].toString();

            return {
                asset_id,
                tx_hash: transaction.hash
            }
        } else{
            debug("Method not recognized");
        }
    }

    async getLeaseObj(transaction, _events, blockNumber, blockHash) {
        let event = _events[0];
        debug("Asset-Registry - getLeaseObj: ", event.event.toHuman())
        if (event.meta.name.toString() === 'LeaseCreated') {
            let id = event.event.data[0].toString();
            let lessor = event.event.data[1].id.toString();
            let lessee = event.event.data[2].id.toString();

            return {
                id,
                lessor,
                lessee,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }

        }else if((['LeaseVoided']).includes(event.meta.name.toString())){
            let lease_id = event.event.data[0].toString();

            return {
                lease_id,
                tx_hash: transaction.hash
            }
        } else{
            debug("Method not recognized");
        }
    }
}
