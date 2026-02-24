import {CatalogActivityRow, CatalogRow, IdentityActivityRow, IdentityRow} from "be-datastore/dist/lib/dbTypes";
import {EventFull} from "#types";
import {BlockHash} from "@polkadot/types/interfaces";
import {ApiSingleton} from "#api";

import Debug from "debug";

 
const debug = Debug("be-harvester:identity");


export default class IdentityClass {

  public static convertDid(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): IdentityRow {
    const did = ApiSingleton.getEventData(event, 'did');
    const subject = ApiSingleton.getEventData(event, 'subject');
    const controller = ApiSingleton.getEventData(event, 'controller');
    debug(`did: ${did}, subject: ${subject}, controller: ${controller} `);
    if (did && subject && controller) {
      return {
        did,
        subject,
        controller,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertDidActivity(event: EventFull): IdentityActivityRow {
    const did = ApiSingleton.getEventData(event, 'did');
    if (did) {
      return {
        did,
        tx_hash: event.extrinsicHash
      };
    }
  }

  public static convertCatalog(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): CatalogRow {
    const catalog_id = ApiSingleton.getEventData(event, 'catalog_id');
    const caller = ApiSingleton.getEventData(event, 'caller');
    const controller = ApiSingleton.getEventData(event, 'controller');
    if (catalog_id && caller && controller) {
      return {
        id: catalog_id,
        caller,
        controller,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertCatalogActivity(event: EventFull): CatalogActivityRow {
    const catalog_id = ApiSingleton.getEventData(event, 'catalog_id');
    if (catalog_id) {
      return {
        catalog_id,
        tx_hash: event.extrinsicHash
      };
    }
  }
}
