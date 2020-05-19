const debug = require("debug")("watcher:BlockProcessor");

import {ADDAX_ADDRESS, TTL, Store, DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS} from "./config";
import {types} from "./primitives";
import AssetRegistry from "./AssetRegistry";
import {WsProvider} from '@polkadot/rpc-provider';
import { publish, set, knex} from "./db";

const {ApiPromise} = require('@polkadot/api');

export default class BlockProcessor {
    private api;
    private store;
    private latestBlockNumber = 0;
    private assetRegistry;

    async init() {
        if (!this.api) {
            this.api = await ApiPromise.create({
                provider: new WsProvider(ADDAX_ADDRESS),
                types: types
            });
            this.store = await Store.DataStore(DB_TYPE, DB_URL, REDIS_HOSTS, REDIS_PORTS, TTL);
            this.assetRegistry = new AssetRegistry(this.store, this.api);
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
            let map = {};

            let txObjs = [], inhObjs = [], evnObjs = [], logObjs =[], leaseObjs = [];
            // Listen for events
            try {
                let events = await this.api.query.system.events.at(blockHash);
                //console.log('Events of block %d is %o', blockNumber, this.toJson(events.toHuman({isExtended: true})));
                //Save events separately
                for (let i = 0; i < events.length; i++) {
                    const {event, phase} = events[i];
                    const id = `${blockNumber}-${i}`;
                    let _event = {
                        id: id,
                        phase: phase,
                        meta: event.meta,
                        event: event,
                        index: i,
                        blockNumber: blockNumber,
                        extrinsicid: phase.isApplyExtrinsic ? `${blockNumber}-${phase.asApplyExtrinsic}` : null
                    };

                    if (phase.isApplyExtrinsic) {
                        if (!map[`${blockNumber}-${phase.asApplyExtrinsic}`]) {
                            map[`${blockNumber}-${phase.asApplyExtrinsic}`] = [];
                        }
                        map[`${blockNumber}-${phase.asApplyExtrinsic}`].push(id);
                    }
                    _events.push(id);
                    evnObjs.push(_event);
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
                    transaction["blockNumber"]=blockNumber;
                    _transactions.push(hash);
                    txObjs.push(transaction);

                    if(transaction.method.section === 'assetRegistry'){
                        leaseObjs.push(await this.assetRegistry.process(transaction, evnObjs, blockNumber,blockHash));
                    }
                } else {
                    const id = `${blockNumber}-${i}`;
                    let inherent = ex.toHuman({isExtended: true});
                    if (inherent.method.section === 'timestamp') {
                        timestamp = inherent.method.args[0].replace(/,/g, '');
                        timestamp = Number(timestamp);
                    }
                    inherent["index"] = i;
                    inherent["id"] = id;
                    inherent["events"] = map[`${blockNumber}-${i}`];
                    inherent["blockNumber"] = blockNumber;
                    _inherents.push(id);
                    inhObjs.push(inherent);
                }
            }

            //Save logs separately
            for (let i = 0; i < _block.block.header.digest.logs.length; i++) {
                const id = `${blockNumber}-${i}`;
                let log = {};
                log["log"] = _block.block.header.digest.logs[i].toHuman({isExtended: true});
                log["id"] = id;
                log["index"] = 0;
                log["blockNumber"] = blockNumber;
                _logs.push(id);
                logObjs.push(log);
            }

            let block = {
                number: blockNumber,
                hash: blockHash,
                parentHash: _block.block.header.parentHash.toString(),
                stateRoot: _block.block.header.stateRoot.toString(),
                extrinsicsRoot: _block.block.header.extrinsicsRoot.toString(),
                timestamp: timestamp,
                transactions: _transactions,
                inherents: _inherents,
                events: _events,
                logs: _logs,
            };

            evnObjs.forEach(evn=>{
                evn.timestamp = timestamp;
                calls.push(this.store.event.save(evn));
            });

            txObjs.forEach(tx=>{
                tx.timestamp = timestamp;
                calls.push(this.store.transaction.save(tx));
            });

            inhObjs.forEach(inh=>{
                inh.timestamp = timestamp;
                calls.push(this.store.inherent.save(inh));
            });

            logObjs.forEach(log=>{
                log.timestamp = timestamp;
                calls.push(this.store.log.save(log));
            });

            leaseObjs.forEach(ls => {
                if(ls.tx_hash){
                    calls.push(this.store.lease.saveActivity(ls))
                } else {
                    ls.timestamp = timestamp;
                    calls.push(this.store.lease.save(ls));
                }
            });

            calls.push(this.store.block.save(block));
            //console.log('Block %d ===> %j', blockNumber, block);

            try {
                await Promise.all(calls);
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


