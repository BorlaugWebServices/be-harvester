const debug = require("debug")("be-harvester:audit");

import _ from "lodash";
import {hexToString, isHex} from '@polkadot/util';

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
    async process(transaction, events, blockNumber, blockHash) {
        debug("In Audit - process: ", JSON.stringify(transaction));
        let event = events[0];
        debug("In Audit - events: ", JSON.stringify(event));
        if (event.meta.name.toString() === 'AuditCreated') {
            let id = event.event.data[2].toString();
            let auditStorage = await this.api.query.audits.audits(id);
            debug("In Audit - auditStorage: ", JSON.stringify(auditStorage));
            let audit_creator = auditStorage.toHuman().audit_creator.toString();
            let auditor = auditStorage.toHuman().auditing_org.toString();

            return {
                id,
                audit_creator,
                auditor,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }
        } else if ((['AuditLinked', 'AuditUnlinked']).includes(event.meta.name.toString())) {
            let audit_id = Number(event.event.data[1].toString());

            return {
                audit_id,
                tx_hash: transaction.hash
            }
        } else {
            debug(transaction.method.method);
            let audit_id = Number(event.event.data[2].toString());

            return {
                audit_id,
                tx_hash: transaction.hash
            }
        }
    }
}
