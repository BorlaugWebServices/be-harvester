import Debug from "debug";
import {GroupActivityRow, GroupRow} from "be-datastore/dist/lib/dbTypes";
import {EventFull} from "#types";
import {BlockHash} from "@polkadot/types/interfaces";
import {ApiSingleton} from "#api";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug("be-harvester:group");

export default class GroupClass {

  public static convertGroup(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): GroupRow {
    const group_id = ApiSingleton.getEventData(event, 'group_id');
    const group_creator = ApiSingleton.getEventData(event, 'group_creator');
    if (group_id && group_creator) {
      return {
        id: group_id,
        group_creator,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertGroupActivity(event: EventFull): GroupActivityRow {
    const group_id = ApiSingleton.getEventData(event, 'group_id');
    if (group_id) {
      return {
        group_id,
        tx_hash: event.extrinsicHash
      };
    }
  }


}
