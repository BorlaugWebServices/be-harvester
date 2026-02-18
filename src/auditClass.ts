import Debug from "debug";
import {AuditActivityRow, AuditRow} from "be-datastore/dist/lib/dbTypes";
import {EventFull} from "#types";
import {BlockHash} from "@polkadot/types/interfaces";
import {ApiSingleton} from "#api";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug("be-harvester:audit");


export default class AuditClass {

  public static convertAudit(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): AuditRow {
    const audit_id = ApiSingleton.getEventData(event, 'audit_id');
    const audit_creator = ApiSingleton.getEventData(event, 'audit_creator');
    const auditor = ApiSingleton.getEventData(event, 'auditor');
    if (audit_id && audit_creator && auditor) {
      return {
        id: audit_id,
        audit_creator,
        auditor,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertAuditActivity(event: EventFull): AuditActivityRow {
    const audit_id = ApiSingleton.getEventData(event, 'audit_id');
    if (audit_id) {
      return {
        audit_id,
        tx_hash: event.extrinsicHash
      };
    }
  }


}
