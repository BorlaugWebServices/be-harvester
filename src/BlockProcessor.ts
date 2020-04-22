const debug = require("debug")("watcher:BlockProcessor");

import {ADDAX_ADDRESS,TTL} from "./config";
import {types} from "./primitives";
import AssetRegistry from "./AssetRegistry";
import {WsProvider} from '@polkadot/rpc-provider';
import { publish, set, knex} from "./db";

const {ApiPromise} = require('@polkadot/api');

export default class BlockProcessor {
    private api;
    private latestBlockNumber = 0;
    private assetRegistry = new AssetRegistry();

    async init() {
        if (!this.api) {
            this.api = await ApiPromise.create({
                provider: new WsProvider(ADDAX_ADDRESS),
                types: types
            });
        }
    }

    async subscribeNewHeads() {
        await this.init();
        await this.api.rpc.chain.subscribeNewHeads(header => {
            const blockNumber = this.toJson(header.number);
            console.log('Chain is at block: %d ;', blockNumber);
            this.getBlock(blockNumber);
        });
    }

    async getBlock(blockNumber: number): Promise<string> {
        await this.init();
        try {
            let blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
            if (blockNumber > this.latestBlockNumber) {
                this.latestBlockNumber = blockNumber;
                await set("latestBlockNumber", this.latestBlockNumber);
            }
            blockHash = this.toJson(blockHash);
            //console.log('Block Hash of block %d is %o ;', blockNumber, blockHash);

            let _block = await this.api.rpc.chain.getBlock(blockHash);
            let timestamp = null;
            let _transactions = [];
            let _inherents = [];
            let _events = [];
            let _logs = [];
            let calls = [];
            let assetRegistryCalls = [];
            let map = {};

            // Listen for events
            try {
                let events = await this.api.query.system.events.at(blockHash);
                //console.log('Events of block %d is %o', blockNumber, this.toJson(events.toHuman({isExtended: true})));
                //Save events separately
                for (let i = 0; i < events.length; i++) {
                    const {event, phase} = events[i];
                    const id = `${blockNumber}-${i}`;
                    const key = `evn:${id}`;
                    let _event = {
                        id: id,
                        phase: phase,
                        meta: event.meta,
                        event: event,
                        index: i,
                        extrinsicid: phase.isApplyExtrinsic ? `${blockNumber}-${phase.asApplyExtrinsic}` : null
                    };

                    if (phase.isApplyExtrinsic) {
                        if (!map[`${blockNumber}-${phase.asApplyExtrinsic}`]) {
                            map[`${blockNumber}-${phase.asApplyExtrinsic}`] = [];
                        }
                        map[`${blockNumber}-${phase.asApplyExtrinsic}`].push(id);
                    }
                    _events.push(key);
                    calls.push(set(key, JSON.stringify(_event), 'EX', TTL));
                }
            } catch (e) {
                console.log("Can't get events of %d, Error : %O ;", blockNumber, e);
            }

            //Save extrinsics separately
            for (let i = 0; i < _block.block.extrinsics.length; i++) {
                let ex = _block.block.extrinsics[i];
                //console.log('Extrinsic index %o', ex.method.callIndex);
                if (ex.isSigned) {
                    let hash = ex.hash.toHex();
                    let transaction = ex.toHuman({isExtended: true});
                    transaction["index"] = i;
                    transaction["id"] = `${blockNumber}-${i}`;
                    transaction["hash"] = hash;
                    transaction["events"] = map[`${blockNumber}-${i}`];
                    _transactions.push(hash);
                    calls.push(set(hash, JSON.stringify(transaction), 'EX',TTL));
                    if(transaction.method.section === 'assetRegistry'){
                        await assetRegistryCalls.push(this.assetRegistry.process(transaction,blockNumber,blockHash));
                    }
                } else {
                    const id = `${blockNumber}-${i}`;
                    const key = `inh:${id}`;
                    let inherent = ex.toHuman({isExtended: true});
                    if (inherent.method.section === 'timestamp') {
                        timestamp = inherent.method.args[0].replace(/,/g, '');
                        timestamp = Number(timestamp);
                    }
                    inherent["index"] = i;
                    inherent["id"] = id;
                    inherent["events"] = map[`${blockNumber}-${i}`];
                    _inherents.push(key);
                    calls.push(set(key, JSON.stringify(inherent), 'EX', TTL));
                }
            }

            //Save logs separately
            for (let i = 0; i < _block.block.header.digest.logs.length; i++) {
                const id = `${blockNumber}-${i}`;
                const key = `log:${id}`;
                let log = _block.block.header.digest.logs[i].toHuman({isExtended: true});
                log["id"] = id;
                _logs.push(key);
                calls.push(set(key, JSON.stringify(log), 'EX', TTL));
            }

            let blockKey = `block:${blockNumber}`;
            let block = {
                header: {
                    parentHash: _block.block.header.parentHash,
                   number: _block.block.header.number,
                    stateRoot: _block.block.header.stateRoot,
                    extrinsicsRoot: _block.block.header.extrinsicsRoot,
               },
                transactions: _transactions,
                inherents: _inherents,
                events: _events,
                logs: _logs,
                hash: blockHash,
                number: blockNumber,
                timestamp: timestamp
            };

            calls.push(knex("block").insert({
                number: blockNumber,
                hash: blockHash,
                parentHash: _block.block.header.parentHash.toString(),
                stateRoot: _block.block.header.stateRoot.toString(),
                extrinsicsRoot: _block.block.header.extrinsicsRoot.toString(),
                timestamp: timestamp
            }));
            //console.log('Block %d ===> %j', blockNumber, block);

            try {
                calls.push(set(blockKey, JSON.stringify(block), 'EX', TTL));
                calls.push(publish('blockUpdated', JSON.stringify(block)));
                await Promise.all(calls);
                await Promise.all(assetRegistryCalls);
                console.log('Block %d synced ;', blockNumber);
                return JSON.stringify(block);
            } catch (err) {
                console.log('Block %d sync failed. Error: %O ;', blockNumber, err);
            }
        } catch (e) {
            console.log('Block %d fetch failed. Error: %O ;', blockNumber, e);
            return null;
        }
    }

    toJson(type) {
        return JSON.parse(JSON.stringify(type));
    }
}


