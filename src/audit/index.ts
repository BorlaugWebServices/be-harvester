const debug = require("debug")("be-harvester:audit");

import _ from "lodash";
import {hexToString} from '@polkadot/util';

export default class Audit {

    private store;
    private api;

    constructor(store, api) {
        this.store = store;
        this.api = api;
    }

    /**
     * checks transaction with `audit` module and creates/updates a identity object
     */
    async process(transaction, _events, blockNumber, blockHash) {
        if (transaction.method.section !== 'audits') {
            throw new Error("Not an audit transaction");
        }

        if (transaction.method.method === 'createAudit') {
            debug('createAudit');

            let events = _.filter(_events, (e) => {
                return transaction.events.includes(e.id) && e.meta.name.toString() === 'AuditCreated';
            });

            if (events.length > 0) {
                let event = events[0];
                let account_id = event.event.data[0].toString();
                let id = event.event.data[1].toString();
                let auditStorage = await this.api.query.audits.audits(id);
                let audit_creator = auditStorage.audit_creator.toString();
                let auditor = auditStorage.auditor.toString();

                return {
                    id,
                    audit_creator,
                    auditor,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash
                }
            } else {
                throw new Error(`CreateAudit Event not found`);
            }
        } else if (['deleteAudit', 'acceptAudit', 'rejectAudit', 'completeAudit', 'createObservation',
            'createEvidence', 'linkEvidence', 'unlinkEvidence', 'deleteEvidence',].includes(transaction.method.method)) {
            debug(transaction.method.method);
            let audit_id = Number(transaction.method.args[0]);

            return {
                audit_id,
                tx_hash: transaction.hash
            }
        } else {
            // throw new Error("Method not recognized");
            debug("Method not recognized");
        }

    }

    private getProperties(args) {
        let properties = [];

        if (args && Array.isArray(args)) {
            args.forEach(obj => {
                // debug(obj);
                let name = isHex(obj.name)?hexToString(obj.name):obj.name;
                let fact = null;

                if (obj.fact.Text) {
                    fact = isHex(obj.fact.Text)?hexToString(obj.fact.Text):obj.fact.Text;
                } else if (obj.fact.Bool !== null) {
                    fact = obj.fact.Bool;
                } else if (obj.fact.U8) {
                    fact = obj.fact.U8;
                }
                //debug("property :", {name, fact});
                properties.push({
                    name,
                    fact
                })
            });
        }

        return properties;
    }
}