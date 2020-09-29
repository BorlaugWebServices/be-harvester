import {ApiPromise} from "@polkadot/api";
import {WsProvider} from '@polkadot/rpc-provider';
import {hexToString} from '@polkadot/util';

const debug = require("debug")("be-harvester:rpc");
const jayson = require('jayson');
import BlockProcessor from "../BlockProcessor";
import {DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, Store, TTL_MIN, TTL_MAX, ADDAX_ADDRESS, TYPES} from "../config";

const NUMBER_PATTERN = RegExp('^[0-9]*$');
const HASH_PATTERN = RegExp('^0x([A-Fa-f0-9]{64})$');

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
            if (!this.api) {
                this.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let prop = await this.api.query.identity.didInfo(did);
            let properties = [];
            prop.toJSON().properties.forEach(prop => {
                properties.push({
                    name: hexToString(prop.name),
                    fact: prop.fact.Text?hexToString(prop.fact.Text):prop.fact.Bool?prop.fact.Bool:prop.fact.U8
                });
            });
            // debug('didDoc: %O', properties);

            let _claims = await this.api.query.identity.claimsOf(did);
            for (let i = 0; i < _claims.length; i++) {
                _claims[i] = await this.api.query.identity.claims(did, _claims[i]);
                _claims[i]=_claims[i].toJSON();
            }

            let claims = [];
            _claims.forEach(_claim => {
                let claim = {
                    ..._claim,
                    description: hexToString(_claim.description),
                    statements: []
                }
                _claim.statements.forEach(st=>{
                    claim.statements.push({
                        name: hexToString(st.name),
                        fact: st.fact.Text?hexToString(st.fact.Text):st.fact.Bool?st.fact.Bool:st.fact.U8,
                        for_issuer: st.for_issuer
                    })
                });
                claims.push(claim);
            });
            // debug('claims: %O', claims);

            let didDoc = {
                did,
                properties,
                claims,
            }

            callback(null, didDoc);
        } catch (e) {
            //console.error(e);
            debug(e);
            callback(null, false);
        }
    },
    getTemplateSteps: async function({ registryid, templateid, index }, callback) {
        debug('getDIDState: RegistryId - %d , TemplateId - %d, index - %d', registryid, templateid, index);

        try {
            if (!this.api) {
                this.api = await ApiPromise.create({
                    provider: new WsProvider(ADDAX_ADDRESS),
                    types: TYPES
                });
            }

            let registry = await this.api.query.provenance.templateSteps([registryid, templateid], index);
            debug(registry.toJSON());

            callback(null, registry.toHuman(true));
        } catch (e) {
            debug(e);
            callback(null, false);
        }
    }
});