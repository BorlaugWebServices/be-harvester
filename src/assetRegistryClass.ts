import Debug from "debug";
import {
  AssetActivityRow,
  AssetRegistryActivityRow,
  AssetRegistryRow,
  AssetRow,
  LeaseActivityRow,
  LeaseRow
} from "be-datastore/dist/lib/dbTypes";
import {EventFull} from "#types";
import {ApiSingleton} from "#api";
import {BlockHash} from "@polkadot/types/interfaces";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug("be-harvester:asset-registry");

export default class AssetRegistryClass {

  public static convertRegistry(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): AssetRegistryRow {
    const registry_id = ApiSingleton.getEventData(event, 'registry_id');
    const owner = ApiSingleton.getEventData(event, 'owner');
    if (registry_id && owner) {
      return {
        id: registry_id,
        owner,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertRegistryActivity(event: EventFull): AssetRegistryActivityRow {
    const registry_id = ApiSingleton.getEventData(event, 'registry_id');
    if (registry_id) {
      return {
        registry_id,
        tx_hash: event.extrinsicHash
      };
    }
  }

  public static convertAsset(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): AssetRow {
    const asset_id = ApiSingleton.getEventData(event, 'asset_id');
    const registry_id = ApiSingleton.getEventData(event, 'registry_id');
    if (asset_id && registry_id) {
      return {
        id: asset_id,
        registry_id,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertAssetActivity(event: EventFull): AssetActivityRow {
    const asset_id = ApiSingleton.getEventData(event, 'asset_id');
    if (asset_id) {
      return {
        asset_id,
        tx_hash: event.extrinsicHash
      };
    }
  }

  public static convertLease(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): LeaseRow {
    const lease_id = ApiSingleton.getEventData(event, 'lease_id');
    const lessor = ApiSingleton.getEventData(event, 'lessor');
    const lessee = ApiSingleton.getEventData(event, 'lessee');
    if (lease_id && lessor && lessee) {
      return {
        id: lease_id,
        lessor,
        lessee,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertLeaseActivity(event: EventFull): LeaseActivityRow {
    const lease_id = ApiSingleton.getEventData(event, 'lease_id');
    if (lease_id) {
      return {
        lease_id,
        tx_hash: event.extrinsicHash
      };
    }
  }

}
