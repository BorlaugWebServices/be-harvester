import {BlockProcessor} from "#blockProcessor";
import {DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, TTL_MAX, TTL_MIN} from "#config";
import {Asset, Claim, DefinitionStep, DidProperty, Group, ProcessStep} from "#chainTypes";
import type {AccountInfo} from '@polkadot/types/interfaces';
import {ApiSingleton} from "#api";
import jayson from 'jayson';
import Debug from "debug";
import {DataStore} from "be-datastore";

const debug = Debug("be-harvester:rpc");

const NUMBER_PATTERN = RegExp('^[0-9]*$');
const HASH_PATTERN = RegExp('^0x([A-Fa-f0-9]{64})$');
const TX_HASH_PATTERN = RegExp('^0x([A-Fa-f0-9]{64})$');

const blockProcessor = new BlockProcessor();

export const server = jayson.server({
  syncBlock: async function ({numberOrHash}, callback) {
    let block = null;
    debug(`Block %o sync request`, numberOrHash);

    if (NUMBER_PATTERN.test(numberOrHash)) {
      try {
        block = await blockProcessor.getBlockByNumber(numberOrHash);
      } catch (e) {
        debug(`Block ${numberOrHash} not found; Error ${e}`);
      } finally {
        callback(null, block);
      }
    } else if (HASH_PATTERN.test(numberOrHash)) {
      try {
        block = await blockProcessor.getBlockByHash(numberOrHash);
      } catch (e) {
        debug(`Block ${numberOrHash} not found; Error ${e}`);
      } finally {
        callback(null, block);
      }
    } else {
      debug('Invalid block number or hash');
      callback(null, block);
    }
  },
  syncTransaction: async function ({blockHash, txHash}, callback) {
    let tx = null;
    debug(`Transaction ${blockHash} of block ${txHash} sync request`);

    if (HASH_PATTERN.test(blockHash) && TX_HASH_PATTERN.test(txHash)) {
      try {
        //just sync whole block
        tx = await blockProcessor.getBlockByHash(blockHash);
      } catch (e) {
        debug(`Transaction ${txHash} not found; Error ${e}`);
      } finally {
        callback(null, tx);
      }
    } else {
      debug('Invalid block hash or transaction hash');
      callback(null, tx);
    }
  },
  cleanup: async function ({blockNumber}, callback) {
    try {
      if (!this.store) {
        this.store = new DataStore(DB_TYPE, DB_URL, REDIS_HOST, Number(REDIS_PORT), Number(TTL_MIN), Number(TTL_MAX));
        await this.store.connect();
      }

      const count = await this.store.cleanup();

      callback(null, count);
    } catch (e) {
      //console.error(e);
      debug(e);
      callback(null, false);
    }
  },
  getDIDState: async function ({did}, callback) {
    debug('getDIDState: %s', did);

    try {
      if (!blockProcessor.api) {
        blockProcessor.api = await ApiSingleton.getInstance();
      }

      const all_entries = await blockProcessor.api.query.identity.didDocumentProperties.entries(did);
      const properties = [];
      all_entries.forEach(([{args: [did, hash]}, value]) => {
        const property = value.toHuman() as unknown as DidProperty;
        debug("Property", property);
        properties.push({
          name: property.name,
          fact: getPropertyValue(property.fact),
        });
      });
      debug('didDoc: %O', properties);

      const all_claim_entries = await blockProcessor.api.query.identity.claims.entries(did);
      const claims = [];
      all_claim_entries.forEach(([{args: [did, claim_id]}, value]) => {
        const claim = value.toHuman() as unknown as Claim;
        claim.statements = claim.statements.map(s => ({
          ...s,
          fact: getPropertyValue(s.fact)
        }));
        claims.push(claim);
      });
      debug('Claims: %O', claims);

      const didDoc = {
        did,
        properties,
        claims,
      };

      callback(null, didDoc);
    } catch (e) {
      debug(e);
      callback(null, false);
    }
  },
  getTemplateSteps: async function ({registryid, templateid}, callback) {
    debug('getTemplateSteps: RegistryId - %d, TemplateId - %d', registryid, templateid);

    try {
      if (!blockProcessor.api) {
        blockProcessor.api = await ApiSingleton.getInstance();
      }

      let i = 0;
      const steps = [];

      while (true) {
        const stepCodec = await blockProcessor.api.query.provenance.definitionSteps([registryid, templateid], i);
        const step: DefinitionStep = stepCodec.toHuman(true) as unknown as DefinitionStep;
        debug("In Provenance RPC - definitionSteps", step);
        if (step) {
          steps.push(step);
          i++;
        } else {
          break;
        }
      }

      callback(null, steps);
    } catch (e) {
      debug(e);
      callback(null, false);
    }
  },
  getSequenceSteps: async function ({registryid, templateid, sequenceid}, callback) {
    debug('getSequenceSteps: RegistryId - %d, TemplateId - %d, SequenceId - %d', registryid, templateid, sequenceid);

    try {
      if (!blockProcessor.api) {
        blockProcessor.api = await ApiSingleton.getInstance();
      }

      let i = 0;
      const steps = [];

      while (true) {
        const stepCodec = await blockProcessor.api.query.provenance.processSteps([registryid, templateid, sequenceid], i);
        const step = stepCodec.toHuman(true) as unknown as ProcessStep;
        debug("In Provenance RPC - ProcessSteps", step);
        if (step) {
          // let attestor = await blockProcessor.api.query.provenance.attestors([registryid, templateid, i], step.attested_by.id);
          // attestor = attestor.toHuman(true)
          steps.push(step);
          i++;
        } else {
          break;
        }
      }

      callback(null, steps);
    } catch (e) {
      debug(e);
      callback(null, false);
    }
  },
  getGroup: async function ({group_id}, callback) {
    debug('getGroup: %s', group_id);

    try {
      if (!blockProcessor.api) {
        blockProcessor.api = await ApiSingleton.getInstance();
      }

      const groupCodec = await blockProcessor.api.query.groups.groups(group_id);
      const all_entries = await blockProcessor.api.query.groups.groupMembers.entries(group_id);
      const group_members = [];
      all_entries.forEach(([{args: [groupid, member_account]}, value]) => {
        const weight = value.toHuman();
        group_members.push({
          account: member_account,
          weight: weight,
        });
      });
      const group = groupCodec.toHuman() as unknown as Group;
      callback(null, group);
    } catch (e) {
      debug(e);
      callback(null, false);
    }
  },
  getBalance: async function ({address}, callback) {
    debug('getBalance: %s', address);

    try {
      if (!blockProcessor.api) {
        blockProcessor.api = await ApiSingleton.getInstance();
      }
      const accountInfo = await blockProcessor.api.query.system.account(address);
      const {
        data: {free: previousFree},
        nonce: previousNonce
      } = accountInfo as unknown as AccountInfo;

      callback(null, previousFree.toString());
    } catch (e) {
      debug(e);
      callback(null, false);
    }
  },
  getAsset: async function ({registry_id, asset_id}, callback) {
    debug('getAsset: %s %s', registry_id, asset_id);

    try {
      if (!blockProcessor.api) {
        blockProcessor.api = await ApiSingleton.getInstance();
      }

      const assetCodec = await blockProcessor.api.query.assetRegistry.assets(registry_id, asset_id);
      const asset = assetCodec.toHuman(true) as unknown as Asset;
      debug("In Asset Registry RPC - Asset", asset);
      callback(null, asset);
    } catch (e) {
      debug(e);
      callback(null, false);
    }
  },
  getLease: async function ({lessor, lease_id}, callback) {
    debug('getLease: %s', lease_id);

    try {
      if (!blockProcessor.api) {
        blockProcessor.api = await ApiSingleton.getInstance();
      }

      const lease = await blockProcessor.api.query.assetRegistry.leaseAgreements(lessor, lease_id);
      debug("In Asset Registry RPC - Lease", lease);
      callback(null, lease);
    } catch (e) {
      debug(e);
      callback(null, false);
    }
  }
});

function getPropertyValue(fact) {
  if (fact.Text) {
    return fact.Text;
  } else if (fact.Bool) {
    return fact.Bool;
  } else if (fact.U8) {
    return fact.U8;
  } else if (fact.U16) {
    return fact.U16;
  } else if (fact.U32) {
    return fact.U32;
  } else if (fact.U128) {
    return fact.U128;
  } else if (fact.Date) {
    return fact.Date;
  } else if (fact.Iso8601) {
    return fact.Iso8601;
  }
}
