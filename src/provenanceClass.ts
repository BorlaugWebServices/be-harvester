import Debug from "debug";
import {
  DefinitionActivityRow,
  DefinitionRow,
  RegistryActivityRow,
  RegistryRow,
  SequenceActivityRow,
  SequenceRow,
} from "be-datastore/dist/lib/dbTypes";
import {EventFull} from "#types";
import {BlockHash} from "@polkadot/types/interfaces";
import {ApiSingleton} from "#api";


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug("be-harvester:provenance");

export default class ProvenanceClass {

  public static convertRegistry(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): RegistryRow {
    const registry_id = ApiSingleton.getEventData(event, 'registry_id');
    const creator = ApiSingleton.getEventData(event, 'creator');
    const creator_group = ApiSingleton.getEventData(event, 'creator_group');
    if (registry_id && creator && creator) {
      return {
        id: registry_id,
        creator,
        creator_group,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertRegistryActivity(event: EventFull): RegistryActivityRow {
    const registry_id = ApiSingleton.getEventData(event, 'registry_id');
    if (registry_id) {
      return {
        registry_id,
        tx_hash: event.extrinsicHash
      };
    }
  }

  public static convertDefinition(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): DefinitionRow {
    const definition_id = ApiSingleton.getEventData(event, 'definition_id');
    const registry_id = ApiSingleton.getEventData(event, 'registry_id');
    const account_id = ApiSingleton.getEventData(event, 'account_id');
    const group_account_id = ApiSingleton.getEventData(event, 'group_account_id');
    if (definition_id && registry_id) {
      return {
        id: definition_id,
        registry_id,
        creator: account_id,
        creator_group: group_account_id,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertDefinitionActivity(event: EventFull): DefinitionActivityRow {
    const definition_id = ApiSingleton.getEventData(event, 'definition_id');
    if (definition_id) {
      return {
        definition_id,
        tx_hash: event.extrinsicHash
      };
    }

  }

  public static convertProcess(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): SequenceRow {
    const process_id = ApiSingleton.getEventData(event, 'process_id');
    const definition_id = ApiSingleton.getEventData(event, 'definition_id');
    const registry_id = ApiSingleton.getEventData(event, 'registry_id');
    const account_id = ApiSingleton.getEventData(event, 'account_id');
    const group_account_id = ApiSingleton.getEventData(event, 'group_account_id');
    if (process_id && definition_id && registry_id) {
      return {
        id: process_id,
        name: null,
        registry: registry_id,
        template: definition_id,
        sequence_creator: account_id,
        sequence_creator_group: group_account_id,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertProcessActivity(event: EventFull): SequenceActivityRow {
    const process_id = ApiSingleton.getEventData(event, 'process_id');
    if (process_id) {
      return {
        sequence_id: process_id,
        tx_hash: event.extrinsicHash
      };
    }
  }


}
