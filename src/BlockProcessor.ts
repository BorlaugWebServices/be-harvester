const debug = require("debug")("be-harvester:BlockProcessor");
const _ = require("lodash");

import {ADDAX_ADDRESS, DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, Store, TTL_MIN, TTL_MAX, TYPES} from "./config";
import AssetRegistry from "./asset-registry";
import Identity from "./identity";
import Audit from "./audit";
import Proposal from "./proposals";
import Group from "./group";
import Provenance from "./provenance";
import {WsProvider} from '@polkadot/rpc-provider';

const {ApiPromise} = require('@polkadot/api');
const NUMBER_PATTERN = RegExp('^[0-9]*$');
const HASH_PATTERN = RegExp('^0x([A-Fa-f0-9]{64})$');

export default class BlockProcessor {
    public api;
    private store;
    private latestBlockNumber = 0;
    private assetRegistry;
    private identity;
    private audit;
    private provenance;
    private proposal;
    private group;

    async init() {
        if (!this.api) {
            this.api = await ApiPromise.create({
                provider: new WsProvider(ADDAX_ADDRESS),
                types: TYPES
            });
            this.store = await Store.DataStore(DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, TTL_MIN, TTL_MAX);
            this.assetRegistry = new AssetRegistry(this.store, this.api);
            this.identity = new Identity(this.store, this.api);
            this.audit = new Audit(this.store, this.api);
            this.provenance = new Provenance(this.store, this.api);
            this.proposal = new Proposal(this.store, this.api);
            this.group = new Group(this.store, this.api);
        }
    }

    async subscribeNewHeads() {
        await this.init();
        await this.api.rpc.chain.subscribeNewHeads(header => {
            const blockNumber = this.toJson(header.number);
            debug('New Block: %d ;', blockNumber);
            this.getBlockByNumber(blockNumber);
        });
    }

    async getBlockByNumber(blockNumber: number): Promise<String> {
        await this.init();
        try {
            let blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
            if (blockNumber > this.latestBlockNumber) {
                this.latestBlockNumber = blockNumber;
            }
            blockHash = this.toJson(blockHash);
            let block = await this.getBlockByHash(blockHash);
            if (!block) {
                debug('Block %d fetch failed ;', blockNumber);
            }
            return block;
        } catch (e) {
            debug('Block %d fetch failed. Error: %O ;', blockNumber, e);
            return null;
        }
    }

    async getBlockByHash(blockHash): Promise<String> {
        try {
            await this.init();
            let _block = await this.api.rpc.chain.getBlock(blockHash);
            //debug("Block : ", this.toJson(_block));
            const blockNumber = _block.block.header.number;
            let isSignificantBlock = _.filter(_block.block.extrinsics.toHuman(true), {"isSigned": true}).length > 0;

            let timestamp = null;
            let _transactions = [];
            let _inherents = [];
            let _events = [];
            let _logs = [];
            let calls = [];
            let map = {};

            let txObjs = [], inhObjs = [], evnObjs = [], logObjs = [];
            let leaseObjs = [], didObjs = [], auditObjs = [], provenanceObjs = [], proposalObjs = [], groupObjs = [];
            // Listen for events
            try {
                let events = await this.api.query.system.events.at(blockHash);

                //Save events separately
                for (let i = 0; i < events.length; i++) {
                    debug(this.toJson(events[i]));
                    const {event, phase} = events[i];
                    const id = `${blockNumber}-${i}`;
                    let _event = {
                        id: id,
                        phase: phase,
                        meta: event.meta,
                        event: event,
                        index: i,
                        blockNumber: blockNumber,
                        extrinsicid: phase.isApplyExtrinsic ? `${blockNumber}-${phase.asApplyExtrinsic}` : null,
                        significant: isSignificantBlock
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
                debug("Can't get events of %d (%s), Error : %O ;", blockNumber, blockHash, e);
                throw e;
            }
            // debug("BlockProcessor - evnObjs: ", evnObjs);

            //Save extrinsics separately
            for (let i = 0; i < _block.block.extrinsics.length; i++) {
                debug(this.toJson(_block.block.extrinsics[i]));
                let ex = _block.block.extrinsics[i];
                if (ex.isSigned) {
                    let hash = ex.hash.toHex();
                    let transaction = ex.toHuman({isExtended: true});
                    transaction["index"] = i;
                    // debug("Transaction : ", transaction);
                    transaction["id"] = `${blockNumber}-${i}`;
                    transaction["hash"] = hash;
                    transaction["events"] = map[`${blockNumber}-${i}`];
                    transaction["blockNumber"] = blockNumber;
                    _transactions.push(hash);
                    txObjs.push(transaction);

                    debug("BlockProcessor - transaction.method.section: ", transaction.method.section);
                    switch (transaction.method.section) {
                        case 'assetRegistry':
                            leaseObjs.push(await this.assetRegistry.process(transaction, evnObjs, blockNumber, blockHash));
                            break;
                        case 'identity':
                            let didObj = await this.identity.process(transaction, evnObjs, blockNumber, blockHash);
                            if (Array.isArray(didObj)) {
                                didObj.forEach(obj => {
                                    didObjs.push(obj);
                                })
                            } else {
                                didObjs.push(didObj);
                            }
                            break;
                        case 'groups':
                            let audit_events = _.filter(evnObjs, (e) => {
                                debug(e.meta.name.toString())
                                return (['AuditCreated', 'AuditRemoved', 'AuditAccepted', 'AuditRejected', 'AuditorsAssigned', 'AuditStarted', 'AuditCompleted', 'AuditLinked', 'AuditUnlinked',
                                    'ObservationCreated', 'EvidenceAttached', 'EvidenceLinked', 'EvidenceUnlinked', 'EvidenceDeleted', 'EvidenceDeleteFailed']).includes(e.meta.name.toString());
                            });
                            if (audit_events.length > 0) {
                                auditObjs.push(await this.audit.process(transaction, audit_events, blockNumber, blockHash));
                            }
                            let proposal_events = _.filter(evnObjs, (e) => {
                                return (['Proposed', 'Voted', 'Approved', 'Disapproved', 'ApprovedByVeto', 'DisapprovedByVeto']).includes(e.meta.name.toString());
                            });
                            if (proposal_events.length > 0) {
                                proposalObjs.push(await this.proposal.process(transaction, proposal_events, blockNumber, blockHash));
                            }
                            // if(audit_events.length === 0 && proposal_events.length === 0){
                            groupObjs.push(await this.group.process(transaction, evnObjs, blockNumber, blockHash));
                            // }
                            break;
                        case 'provenance':
                            provenanceObjs.push(await this.provenance.process(transaction, evnObjs, blockNumber, blockHash));
                            break;
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

            debug('groups : %s ;', JSON.stringify(groupObjs));

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
                significant: isSignificantBlock
            };

            evnObjs.forEach(evn => {
                debug(evn)
                evn.timestamp = timestamp;
                evn.significant = isSignificantBlock;

                calls.push(this.store.event.save(evn));
            });

            txObjs.forEach(tx => {
                tx.timestamp = timestamp;
                calls.push(this.store.transaction.save(tx));
            });

            inhObjs.forEach(inh => {
                inh.timestamp = timestamp;
                calls.push(this.store.inherent.save(inh));
            });

            logObjs.forEach(log => {
                log.timestamp = timestamp;
                log.significant = isSignificantBlock;

                calls.push(this.store.log.save(log));
            });

            didObjs.forEach(did => {
                if (did) {
                    if (did.tx_hash) {
                        calls.push(this.store.identity.saveActivity(did))
                    } else {
                        did.timestamp = timestamp;
                        calls.push(this.store.identity.save(did));
                    }
                }
            });

            leaseObjs.forEach(ls => {
                if (ls) {
                    if (ls.tx_hash) {
                        calls.push(this.store.lease.saveActivity(ls))
                    } else {
                        ls.timestamp = timestamp;
                        calls.push(this.store.lease.save(ls));
                    }
                }
            });

            auditObjs.forEach(adt => {
                if (adt) {
                    if (adt.tx_hash) {
                        calls.push(this.store.audit.saveActivity(adt))
                    } else {
                        adt.timestamp = timestamp;
                        calls.push(this.store.audit.save(adt));
                    }
                }
            });

            groupObjs.forEach(grp => {
                if (grp) {
                    if (grp.tx_hash) {
                        calls.push(this.store.group.saveActivity(grp))
                    } else {
                        grp.timestamp = timestamp;
                        calls.push(this.store.group.save(grp));
                    }
                }
            });

            proposalObjs.forEach(prp => {
                if (prp) {
                    if (prp.tx_hash) {
                        calls.push(this.store.proposal.saveActivity(prp))
                    } else {
                        prp.timestamp = timestamp;
                        calls.push(this.store.proposal.save(prp));
                    }
                }
            });

            provenanceObjs.forEach(prv => {
                debug(prv)
                if (prv) {
                    if (prv.tx_hash) {
                        calls.push(this.store.provenance.saveActivity(prv))
                    } else {
                        prv.timestamp = timestamp;
                        calls.push(this.store.provenance.save(prv));
                        calls.push(this.store.provenance.saveActivity({
                            sequence_id: prv.id,
                            tx_hash: prv.extrinsicHash
                        }))
                    }
                }
            });

            calls.push(this.store.block.save(block));

            try {
                await Promise.all(calls);
                // debug('Block %d synced ;', blockNumber);
                return JSON.stringify(block);
            } catch (err) {
                debug('Block %d sync failed. Error: %O ;', blockNumber, err);
            }
        } catch (e) {
            debug('Block %s fetch failed. Error: %O ;', blockHash, e);
            throw e;
            return null;
        }
    }

    async getTxByHash(blockNumberOrHash, txHash): Promise<String> {
        try {
            await this.init();
            let blockHash = null;
            if (NUMBER_PATTERN.test(blockNumberOrHash)) {
                blockHash = await this.api.rpc.chain.getBlockHash(blockNumberOrHash);

            } else if (HASH_PATTERN.test(blockNumberOrHash)) {
                blockHash = blockNumberOrHash;
            } else {
                debug('Invalid block number/hash %s ;', blockNumberOrHash);
                return null;
            }
            let _block = await this.api.rpc.chain.getBlock(blockHash);
            const blockNumber = _block.block.header.number;
            let isSignificantBlock = _.filter(_block.block.extrinsics.toHuman(true), {"isSigned": true}).length > 0;

            let timestamp = null;
            let _transactions = [];
            let _inherents = [];
            let _events = [];
            let calls = [];
            let map = {};
            let return_tx = {};

            let txObjs = [], inhObjs = [], evnObjs = [], logObjs = [];
            let leaseObjs = [], didObjs = [], auditObjs = [], provenanceObjs = [];
            // Listen for events

            try {
                let events = await this.api.query.system.events.at(blockHash);

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
                        extrinsicid: phase.isApplyExtrinsic ? `${blockNumber}-${phase.asApplyExtrinsic}` : null,
                        significant: isSignificantBlock
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
                debug("Can't get events of %d (%s), Error : %O ;", blockNumber, blockHash, e);
                throw e;
            }

            let ex = _block.block.extrinsics.find(extrinsic => extrinsic.hash.toHex() === txHash);

            if (ex.isSigned) {
                let hash = ex.hash.toHex();
                let transaction = ex.toHuman({isExtended: true});
                transaction["index"] = 1;
                debug("Transaction : ", transaction);
                transaction["id"] = `${blockNumber}-1`;
                transaction["hash"] = txHash;
                transaction["events"] = map[`${blockNumber}-1`];
                transaction["blockNumber"] = blockNumber;
                _transactions.push(hash);
                return_tx = transaction;
                txObjs.push(transaction);

                switch (transaction.method.section) {
                    case 'assetRegistry':
                        leaseObjs.push(await this.assetRegistry.process(transaction, evnObjs, blockNumber, blockHash));
                        break;
                    case 'identity':
                        let didObj = await this.identity.process(transaction, evnObjs, blockNumber, blockHash);
                        if (Array.isArray(didObj)) {
                            didObj.forEach(obj => {
                                didObjs.push(obj);
                            })
                        } else {
                            didObjs.push(didObj);
                        }
                        break;
                    case 'audits':
                        auditObjs.push(await this.audit.process(transaction, evnObjs, blockNumber, blockHash));
                        break;
                    case 'provenance':
                        provenanceObjs.push(await this.provenance.process(transaction, evnObjs, blockNumber, blockHash));
                        break;
                }
            } else {
                const id = `${blockNumber}-1`;
                let inherent = ex.toHuman({isExtended: true});
                if (inherent.method.section === 'timestamp') {
                    timestamp = inherent.method.args[0].replace(/,/g, '');
                    timestamp = Number(timestamp);
                }
                inherent["index"] = 1;
                inherent["id"] = id;
                inherent["events"] = map[`${blockNumber}-1`];
                inherent["blockNumber"] = blockNumber;
                _inherents.push(id);
                inhObjs.push(inherent);
            }

            evnObjs.forEach(evn => {
                evn.timestamp = timestamp;
                evn.significant = isSignificantBlock;

                calls.push(this.store.event.save(evn));
            });

            txObjs.forEach(tx => {
                tx.timestamp = timestamp;
                calls.push(this.store.transaction.save(tx));
            })

            didObjs.forEach(did => {
                if (did) {
                    if (did.tx_hash) {
                        calls.push(this.store.identity.saveActivity(did))
                    } else {
                        did.timestamp = timestamp;
                        calls.push(this.store.identity.save(did));
                    }
                }
            });

            leaseObjs.forEach(ls => {
                if (ls) {
                    if (ls.tx_hash) {
                        calls.push(this.store.lease.saveActivity(ls))
                    } else {
                        ls.timestamp = timestamp;
                        calls.push(this.store.lease.save(ls));
                    }
                }
            });

            auditObjs.forEach(adt => {
                if (adt) {
                    if (adt.tx_hash) {
                        calls.push(this.store.audit.saveActivity(adt))
                    } else {
                        adt.timestamp = timestamp;
                        calls.push(this.store.audit.save(adt));
                    }
                }
            });

            provenanceObjs.forEach(prv => {
                if (prv) {
                    if (prv.tx_hash) {
                        calls.push(this.store.provenance.saveActivity(prv))
                    } else {
                        prv.timestamp = timestamp;
                        calls.push(this.store.provenance.save(prv));
                        calls.push(this.store.provenance.saveActivity({
                            sequence_id: prv.id,
                            tx_hash: prv.extrinsicHash
                        }))
                    }
                }
            });

            try {
                await Promise.all(calls);
                debug('Transaction %d synced ;', txHash);
                return JSON.stringify(return_tx);
            } catch (err) {
                debug('Transaction %d sync failed. Error: %O ;', txHash, err);
            }
        } catch (e) {
            debug('Transaction %s fetch failed. Error: %O ;', txHash, e);
            throw e;
            return null;
        }
    }

    toJson(type) {
        return JSON.parse(JSON.stringify(type));
    }
}


