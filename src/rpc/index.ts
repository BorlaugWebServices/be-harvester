import {ApiPromise} from "@polkadot/api";
import {WsProvider} from '@polkadot/rpc-provider';
import {hexToString} from '@polkadot/util';

const debug = require("debug")("be-harvester:rpc");
const jayson = require('jayson');
import BlockProcessor from "../BlockProcessor";
import {DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, Store, TTL_MIN, TTL_MAX, ADDAX_ADDRESS, TYPES} from "../config";

const NUMBER_PATTERN = RegExp('^[0-9]*$');
const HASH_PATTERN = RegExp('^0x([A-Fa-f0-9]{64})$');
const TX_HASH_PATTERN = RegExp('^0x([A-Fa-f0-9]{64})$');

const blockProcessor = new BlockProcessor();

export const server = jayson.server({
    syncBlock: async function ({numberOrHash}, callback) {
        let block = null;
        debug(`Block %o sync request`, numberOrHash);

        if (NUMBER_PATTERN.test(numberOrHash)) {
            try {
                block = await blockProcessor.getBlockByNumber(numberOrHash);
            } catch (e) {
                debug(`Block %d not found; Error %o ;`, numberOrHash, e);
            } finally {
                callback(null, block);
            }
        } else if (HASH_PATTERN.test(numberOrHash)) {
            try {
                block = await blockProcessor.getBlockByHash(numberOrHash);
            } catch (e) {
                debug(`Block %s not found; Error %o ;`, numberOrHash, e);
            } finally {
                callback(null, block);
            }
        } else {
            debug('Invalid block number or hash');
            callback(null, block);
        }
    },
    syncTransaction: async function ({blockHash, txHash}, callback) {
        let tx = null;
        debug(`Transaction %o of block %o sync request`, blockHash.txHash);

        if (HASH_PATTERN.test(blockHash) && TX_HASH_PATTERN.test(txHash)) {
            try {
                tx = await blockProcessor.getTxByHash(blockHash, txHash);
            } catch (e) {
                debug(`Transaction %s not found; Error %o ;`, txHash, e);
            } finally {
                callback(null, tx);
            }
        } else {
            debug('Invalid block hash or transaction hash');
            callback(null, tx);
        }
    },
    cleanup: async function ({blockNumber}, callback) {
        try {
            if (!this.store) {
                this.store = await Store.DataStore(DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, TTL_MIN, TTL_MAX);
            }

            let count = await this.store.cleanup();

            callback(null, count);
        } catch (e) {
            //console.error(e);
            debug(e);
            callback(null, false);
        }
    },
    getDIDState: async function ({did}, callback) {
        debug('getDIDState: %s', did);

        try {
            if (!blockProcessor.api) {
                blockProcessor.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let all_entries = await blockProcessor.api.query.identity.didDocumentProperties.entries(did);
            let properties = [];
            all_entries.forEach(([{args: [did, hash]}, value]) => {
                debug("Properties", JSON.stringify(value.toHuman()));
                let property = value.toHuman();
                properties.push({
                    name: property.name,
                    fact: getPropertyValue(property.fact),
                });
            });
            debug('didDoc: %O', properties);

            let all_claim_entries = await blockProcessor.api.query.identity.claims.entries(did);
            let claims = [];
            all_claim_entries.forEach(([{args: [did, claim_id]}, value]) => {
                let claim = value.toHuman();
                claim.statements = claim.statements.map(s => ({
                    ...s,
                    fact: getPropertyValue(s.fact)
                }))
                claims.push(claim);
            });
            debug('Claims: %O', claims);

            let didDoc = {
                did,
                properties,
                claims,
            }

            callback(null, didDoc);
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    },
    getTemplateSteps: async function ({registryid, templateid}, callback) {
        debug('getTemplateSteps: RegistryId - %d, TemplateId - %d', registryid, templateid);

        try {
            if (!blockProcessor.api) {
                blockProcessor.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let i = 0;
            let steps = [];

            while (true) {
                let step = await blockProcessor.api.query.provenance.definitionSteps([registryid, templateid], i);
                step = step.toHuman(true);
                debug("In Provenance RPC - definitionSteps", step);
                if (step) {
                    steps.push(step);
                    i++;
                } else {
                    break;
                }
            }

            callback(null, steps);
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    },
    getSequenceSteps: async function ({registryid, templateid, sequenceid}, callback) {
        debug('getSequenceSteps: RegistryId - %d, TemplateId - %d, SequenceId - %d', registryid, templateid, sequenceid);

        try {
            if (!blockProcessor.api) {
                blockProcessor.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let i = 0;
            let steps = [];

            while (true) {
                let step = await blockProcessor.api.query.provenance.processSteps([registryid, templateid, sequenceid], i);
                step = step.toHuman(true);
                debug("In Provenance RPC - ProcessSteps", step);
                if (step) {
                    // let attestor = await blockProcessor.api.query.provenance.attestors([registryid, templateid, i], step.attested_by.id);
                    // attestor = attestor.toHuman(true)
                    steps.push(step);
                    i++;
                } else {
                    break;
                }
            }

            callback(null, steps);
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    },
    getGroup: async function ({group_id}, callback) {
        debug('getGroup: %s', group_id);

        try {
            if (!blockProcessor.api) {
                blockProcessor.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let group = await blockProcessor.api.query.groups.groups(group_id);
            let all_entries = await blockProcessor.api.query.groups.groupMembers.entries(group_id);
            let group_members = [];
            all_entries.forEach(([{args: [groupid, member_account]}, value]) => {
                let weight = value.toHuman();
                group_members.push({
                    account: member_account,
                    weight: weight,
                });
            });
            group = group.toHuman();
            group['members'] = group_members;
            callback(null, group);
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    },
    getBalance: async function ({address}, callback) {
        debug('getBalance: %s', address);

        try {
            if (!blockProcessor.api) {
                blockProcessor.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let { data: { free: previousFree }, nonce: previousNonce } =  await blockProcessor.api.query.system.account(address);
            callback(null, previousFree.toString());
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    },
    getAsset: async function ({registry_id, asset_id}, callback) {
        debug('getAsset: %s %s', registry_id, asset_id);

        try {
            if (!blockProcessor.api) {
                blockProcessor.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let asset = await blockProcessor.api.query.assetRegistry.assets(registry_id, asset_id);
            asset = asset.toHuman(true);
            debug("In Asset Registry RPC - Asset", asset);
            callback(null, asset);
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    },
    getLease: async function ({lessor, lease_id}, callback) {
        debug('getLease: %s', lease_id);

        try {
            if (!blockProcessor.api) {
                blockProcessor.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let lease = await blockProcessor.api.query.assetRegistry.leaseAgreements(lessor, lease_id);
            debug("In Asset Registry RPC - Lease", lease);
            callback(null, lease);
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    }
});

function getPropertyValue(fact) {
    if (fact.Text) {
        return fact.Text;
    } else if (fact.Bool) {
        return fact.Bool
    } else if (fact.U8) {
        return fact.U8;
    } else if (fact.U16) {
        return fact.U16;
    } else if (fact.U32) {
        return fact.U32;
    } else if (fact.U128) {
        return fact.U128;
    } else if (fact.Date) {
        return fact.Date;
    } else if (fact.Iso8601) {
        return fact.Iso8601;
    }
}
