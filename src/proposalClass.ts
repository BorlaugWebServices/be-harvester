import Debug from "debug";
import {ProposalActivityRow, ProposalRow} from "be-datastore/dist/lib/dbTypes";
import {EventFull} from "#types";
import {BlockHash} from "@polkadot/types/interfaces";
import {ApiSingleton} from "#api";

const debug = Debug("be-harvester:proposal");

export default class ProposalClass {

  public static convertProposal(event: EventFull, blockNumber: number, blockHash: BlockHash, timestamp: number | null): ProposalRow {
    const proposal_id = ApiSingleton.getEventData(event, 'proposal_id');
    const proposer = ApiSingleton.getEventData(event, 'proposer');
    const group_id = ApiSingleton.getEventData(event, 'group_id');
    if (proposal_id && proposer && group_id) {
      return {
        id: proposal_id,
        proposer,
        group_id,
        blockNumber,
        blockHash: blockHash.toString(),
        extrinsicHash: event.extrinsicHash,
        timestamp
      };
    }
  }

  public static convertProposalActivity(event: EventFull): ProposalActivityRow {
    const proposal_id = ApiSingleton.getEventData(event, 'proposal_id');
    if (proposal_id) {
      return {
        proposal_id,
        tx_hash: event.extrinsicHash
      };
    }
  }


  /**
   * checks transaction with `proposal` module and creates/updates a identity object
   */
  async process(transaction, events: EventFull[], blockNumber: number, blockHash: BlockHash, timestamp: number | null) {
    debug("In Proposal - process: ", JSON.stringify(transaction));
    const event = events[0];
    debug("In Proposal - events: ", JSON.stringify(event));

    switch (event.name) {
      case 'Proposed': {
        const proposer = ApiSingleton.getEventData(event, 'proposer');
        const group_id = ApiSingleton.getEventData(event, 'group_id');
        const proposal_id = ApiSingleton.getEventData(event, 'proposal_id');

        return {
          id: proposal_id,
          proposer,
          group_id,
          blockNumber,
          blockHash: blockHash.toString(),
          extrinsicHash: transaction.hash,
          timestamp
        };
      }
      case 'Approved': {
        const proposer = transaction.signer.Id.toString();
        const group_id = ApiSingleton.getEventData(event, 'group_id');
        const proposal_id = ApiSingleton.getEventData(event, 'proposal_id');

        return {
          id: proposal_id,
          proposer,
          group_id,
          blockNumber,
          blockHash: blockHash.toString(),
          extrinsicHash: transaction.hash,
          timestamp
        };
      }
      case 'Voted':
      case 'ApprovedByVeto':
      case 'DisapprovedByVeto':
      default: {
        const proposal_id = ApiSingleton.getEventData(event, 'proposal_id');
        return {
          proposal_id,
          tx_hash: transaction.hash
        };
      }
    }
  }
}
