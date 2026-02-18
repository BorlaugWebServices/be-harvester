import {EventFull, HumanEvent, PalletNames,} from "#types";
import AssetRegistryClass from "#assetRegistryClass";
import {DB_TYPE, DB_URL, REDIS_HOST, REDIS_PORT, TTL_MAX, TTL_MIN} from "#config";
import IdentityClass from "#identityClass";
import ProvenanceClass from "#provenanceClass";
import {ApiPromise} from "@polkadot/api";
import {Vec} from '@polkadot/types';
import {BlockHash, EventRecord} from '@polkadot/types/interfaces';
import {ApiSingleton} from "#api";
import Debug from "debug";
import AuditClass from "#auditClass";
import ProposalClass from "#proposalClass";
import GroupClass from "#groupClass";
import {DataStore} from "be-datastore";
import {BlockExpanded, FullBlock, FullInherent, FullTransaction} from "be-datastore/dist/lib/types";
import {
  AssetActivityRow,
  AssetRegistryActivityRow,
  AssetRegistryRow,
  AssetRow,
  AuditActivityRow,
  AuditRow,
  CatalogActivityRow,
  CatalogRow,
  DefinitionActivityRow,
  DefinitionRow,
  EventRow,
  GroupActivityRow,
  GroupRow,
  IdentityActivityRow,
  IdentityRow,
  LeaseActivityRow,
  LeaseRow,
  LogRow,
  ProposalActivityRow,
  ProposalRow,
  RegistryActivityRow,
  RegistryRow,
  SequenceActivityRow,
  SequenceRow,
  TransactionRow
} from "be-datastore/dist/lib/dbTypes";

const debug = Debug("be-harvester:BlockProcessor");


export class BlockProcessor {
  public api: ApiPromise;
  private store: DataStore;
  private latestBlockNumber = 0;


  async init() {
    if (!this.api) {
      this.api = await ApiSingleton.getInstance();
      this.store = new DataStore(DB_TYPE, DB_URL, REDIS_HOST, Number(REDIS_PORT), Number(TTL_MIN), Number(TTL_MAX));
      await this.store.connect();
    }
  }

  async subscribeNewHeads() {
    await this.init();
    await this.api.rpc.chain.subscribeNewHeads(header => {
      const blockNumber = this.toJson(header.number);
      debug(`New Block: ${blockNumber}`);
      this.getBlockByNumber(blockNumber);
    });
  }

  async getBlockByNumber(blockNumber: number): Promise<string> {
    await this.init();
    try {
      let blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
      if (blockNumber > this.latestBlockNumber) {
        this.latestBlockNumber = blockNumber;
      }
      blockHash = this.toJson(blockHash);
      const block = await this.getBlockByHash(blockHash);
      if (!block) {
        debug(`Block ${blockNumber} fetch failed`);
      }
      return block;
    } catch (e) {
      debug(`Block ${blockNumber} fetch failed. Error: ${e}`);
      return null;
    }
  }

  async getBlockByHash(blockHash: BlockHash): Promise<string> {
    try {
      await this.init();
      const chainBlock = await this.api.rpc.chain.getBlock(blockHash);
      const blockNumber = chainBlock.block.header.number.toNumber();
      const isSignificantBlock = chainBlock.block.extrinsics.some(ex => ex && ex.isSigned);


      const transactionHashes: string[] = [];
      const inherentIds: string[] = [];
      const eventIds: string[] = [];
      const logIds: string[] = [];
      const calls = [];
      const map = {};

      const txObjs: FullTransaction[] = [];
      const inhObjs: FullInherent[] = [];
      const eventObjs: EventFull[] = [];
      const logObjs: LogRow[] = [];
      const assetRegistries: AssetRegistryRow[] = [];
      const assetRegistryActivities: AssetRegistryActivityRow[] = [];
      const assets: AssetRow[] = [];
      const assetActivities: AssetActivityRow[] = [];
      const leases: LeaseRow[] = [];
      const leaseActivities: LeaseActivityRow[] = [];
      const dids: IdentityRow[] = [];
      const didActivities: IdentityActivityRow[] = [];
      const groups: GroupRow[] = [];
      const groupActivities: GroupActivityRow[] = [];
      const proposalActivities: ProposalActivityRow[] = [];
      const audits: AuditRow[] = [];
      const auditActivities: AuditActivityRow[] = [];
      const proposals: ProposalRow [] = [];
      const catalogs: CatalogRow[] = [];
      const catalogActivities: CatalogActivityRow[] = [];
      const provenanceRegistries: RegistryRow[] = [];
      const provenanceRegistryActivities: RegistryActivityRow[] = [];
      const definitions: DefinitionRow[] = [];
      const definitionActivities: DefinitionActivityRow[] = [];
      const sequences: SequenceRow[] = [];
      const sequenceActivities: SequenceActivityRow[] = [];
      const transactionStatusMap: string[] = [];

      const extrinsicIndexToHash: Record<number, string> = {};

      chainBlock.block.extrinsics.forEach((ex, i) => {
        if (!ex) return;
        extrinsicIndexToHash[i] = ex.hash.toHex();
      });

      const timestampExtrinsic = chainBlock.block.extrinsics.find(
        ex => ex.method.section === 'timestamp' && ex.method.method === 'set'
      );
      let timestamp: number | null = null;
      if (timestampExtrinsic) {
        timestamp = Number(timestampExtrinsic.args[0].toString());
      }

      try {
        const events = (await this.api.query.system.events.at(blockHash) as Vec<EventRecord>).toArray();

        //Save events separately
        events.forEach(({event, phase}, i) => {
          const id = `${blockNumber}-${i}`;
          const eventHuman = event.toHuman() as unknown as HumanEvent;


          const eventObj: EventFull = {
            id: id,
            phase: phase.toJSON(),
            meta: {
              name: event.meta.name.toString(),
              args: event.meta.fields.map(field => field.typeName.unwrapOr(field.type.toString()).toString()),
              documentation: event.meta.docs.map(doc => doc.toString())
            },
            pallet: eventHuman.section as PalletNames,
            event: event.toJSON(),
            name: eventHuman.method,
            data: eventHuman.data,
            index: i,
            blockNumber,
            extrinsicHash: phase.isApplyExtrinsic ? extrinsicIndexToHash[phase.asApplyExtrinsic.toNumber()] : null,
            extrinsicid: phase.isApplyExtrinsic ? `${blockNumber}-${phase.asApplyExtrinsic}` : null,
            significant: isSignificantBlock,
            timestamp
          };

          if (phase.isApplyExtrinsic) {
            const extrinsicIndex = phase.asApplyExtrinsic.toNumber();
            const extrinsicKey = `${blockNumber}-${extrinsicIndex}`;
            if (!map[extrinsicKey]) {
              map[extrinsicKey] = [];
            }
            map[extrinsicKey].push(id);
            const isSuccess = event.method === 'ExtrinsicSuccess';
            const isFailure = event.method === 'ExtrinsicFailed';
            if (isSuccess || isFailure) {
              transactionStatusMap[extrinsicKey] = isSuccess ? 'Success' : 'Failed';
            }
          }
          eventIds.push(id);
          eventObjs.push(eventObj);
        });

        debug(`events: ${eventObjs.length}`);


        const assetRegistryEvents = eventObjs.filter(ev => ev.pallet === 'assetRegistry');
        if (assetRegistryEvents.length > 0) {
          debug(`assetRegistryEvents: ${assetRegistryEvents.length}`);
        }
        assetRegistryEvents.forEach(event => {
          if (event.name === 'RegistryCreated') {
            const registry = AssetRegistryClass.convertRegistry(event, blockNumber, blockHash, timestamp);
            if (registry) {
              assetRegistries.push(registry);
            }
          } else if (event.name === 'AssetCreated') {
            const asset = AssetRegistryClass.convertAsset(event, blockNumber, blockHash, timestamp);
            if (asset) {
              assets.push(asset);
            }
          } else if (event.name === 'LeaseCreated') {
            const lease = AssetRegistryClass.convertLease(event, blockNumber, blockHash, timestamp);
            if (lease) {
              leases.push(lease);
            }
          } else {
            const registry_id = ApiSingleton.getEventData(event, 'registry_id');
            if (registry_id) {
              const registryActivity = AssetRegistryClass.convertRegistryActivity(event);
              if (registryActivity) {
                assetRegistryActivities.push(registryActivity);
              }
            }
            const asset_id = ApiSingleton.getEventData(event, 'asset_id');
            if (asset_id) {
              const assetActivity = AssetRegistryClass.convertAssetActivity(event);
              if (assetActivity) {
                assetActivities.push(assetActivity);
              }
            }
            const lease_id = ApiSingleton.getEventData(event, 'lease_id');
            if (lease_id) {
              const leaseActivity = AssetRegistryClass.convertLeaseActivity(event);
              if (leaseActivity) {
                leaseActivities.push(leaseActivity);
              }
            }
          }
        });

        const identityEvents = eventObjs.filter(ev => ev.pallet === 'identity');
        if (identityEvents.length > 0) {
          debug(`identityEvents: ${identityEvents.length}`);
        }
        identityEvents.forEach(event => {
          if (event.name === 'Registered') {
            debug(`Registered Event Found`);
            const did = IdentityClass.convertDid(event, blockNumber, blockHash, timestamp);
            if (did) {
              debug(`DID found`);
              dids.push(did);
            }
          } else if (event.name === 'CatalogCreated') {
            const catalog = IdentityClass.convertCatalog(event, blockNumber, blockHash, timestamp);
            if (catalog) {
              catalogs.push(catalog);
            }
          } else {
            const did = ApiSingleton.getEventData(event, 'did');
            if (did) {
              debug(`Did Activity Event Found`);
              const didActivity = IdentityClass.convertDidActivity(event);
              if (didActivity) {
                didActivities.push(didActivity);
              }
            }
            const catalog_id = ApiSingleton.getEventData(event, 'catalog_id');
            if (catalog_id) {
              const catalogActivity = IdentityClass.convertCatalogActivity(event);
              if (catalogActivity) {
                catalogActivities.push(catalogActivity);
              }
            }
          }
        });

        const auditEvents = eventObjs.filter(ev => ev.pallet === 'audit');
        if (auditEvents.length > 0) {
          debug(`auditEvents: ${auditEvents.length}`);
        }
        auditEvents.forEach(event => {
          if (event.name === 'AuditCreated') {
            const audit = AuditClass.convertAudit(event, blockNumber, blockHash, timestamp);
            if (audit) {
              audits.push(audit);
            }
          } else {
            const audit_id = ApiSingleton.getEventData(event, 'audit_id');
            if (audit_id) {
              const auditActivity = AuditClass.convertAuditActivity(event);
              if (auditActivity) {
                auditActivities.push(auditActivity);
              }
            }
          }
        });

        const groupEvents = eventObjs.filter(ev => ev.pallet === 'groups');
        if (groupEvents.length > 0) {
          debug(`groupEvents: ${groupEvents.length}`);
        }
        groupEvents.forEach(event => {
            if (event.name === 'GroupCreated') {
              const group = GroupClass.convertGroup(event, blockNumber, blockHash, timestamp);
              if (group) {
                groups.push(group);

              }
            } else if (event.name === 'Proposed' || event.name === 'Approved') {
              const proposal = ProposalClass.convertProposal(event, blockNumber, blockHash, timestamp);
              if (proposal) {
                proposals.push(proposal);
              }
            } else {
              const group_id = ApiSingleton.getEventData(event, 'group_id');
              if (group_id) {
                const groupActivity = GroupClass.convertGroupActivity(event);
                if (groupActivity) {
                  groupActivities.push(groupActivity);
                }
              }
              const proposal_id = ApiSingleton.getEventData(event, 'proposal_id');
              if (proposal_id) {
                const proposalActivity = ProposalClass.convertProposalActivity(event);
                if (proposalActivity) {
                  proposalActivities.push();
                }
              }

            }
          }
        );

        const provenanceRegistryEvents = eventObjs.filter(ev => ev.pallet === 'provenance');
        if (provenanceRegistryEvents.length > 0) {
          debug(`provenanceRegistryEvents: ${provenanceRegistryEvents.length}`);
        }
        provenanceRegistryEvents.forEach(event => {
          if (event.name === 'RegistryCreated') {
            const registry = ProvenanceClass.convertRegistry(event, blockNumber, blockHash, timestamp);
            if (registry) {
              provenanceRegistries.push(registry);
            }
          } else if (event.name === 'DefinitionCreated') {
            const definition = ProvenanceClass.convertDefinition(event, blockNumber, blockHash, timestamp);
            if (definition) {
              definitions.push(definition);
            }
          } else if (event.name === 'ProcessCreated') {
            const sequence = ProvenanceClass.convertProcess(event, blockNumber, blockHash, timestamp);
            if (sequence) {
              sequences.push(sequence);
            }
          } else {
            const registry_id = ApiSingleton.getEventData(event, 'registry_id');
            if (registry_id) {
              const registryActivity = ProvenanceClass.convertRegistryActivity(event);
              if (registryActivity) {
                provenanceRegistryActivities.push(registryActivity);
              }
            }
            const asset_id = ApiSingleton.getEventData(event, 'definition_id');
            if (asset_id) {
              const assetActivity = ProvenanceClass.convertDefinitionActivity(event);
              if (assetActivity) {
                definitionActivities.push(assetActivity);
              }
            }
            const lease_id = ApiSingleton.getEventData(event, 'process_id');
            if (lease_id) {
              const leaseActivity = ProvenanceClass.convertProcessActivity(event);
              if (leaseActivity) {
                sequenceActivities.push(leaseActivity);
              }
            }
          }
        });


      } catch
        (e) {
        debug(`Can't get events of ${blockNumber}  (${blockHash}), Error : ${e}`);
        throw e;
      }

      //Save extrinsics separately
      chainBlock.block.extrinsics.forEach((ex, i) => {

        if (!ex) return;

        try {
          if (ex.isSigned) {
            const hash = ex.hash.toHex();

            const transactionHuman: any = ex.toHuman(true);

            const transaction: FullTransaction = {
              hash,
              id: `${blockNumber}-${i}`,
              index: i,
              blockNumber,
              nonce: ex.nonce.toString(),
              signature: ex.signature ? ex.signature.toString() : null,
              signer: ex.signer ? ex.signer.toString() : null,
              isSigned: true,
              method: transactionHuman.method,
              era: ex.era.toJSON(),
              tip: ex.tip.toString(),
              events: map[`${blockNumber}-${i}`],
              timestamp
            };

            debug("BlockProcessor - transaction.method.section: ", transaction.method);

            transactionHashes.push(hash);
            txObjs.push(transaction);


          } else {
            const id = `${blockNumber}-${i}`;
            const inherent = ex.toHuman(true) as unknown as FullInherent;
            inherent.index = i;
            inherent.id = id;
            inherent.events = map[`${blockNumber}-${i}`];
            inherent.blockNumber = blockNumber;
            inherent.timestamp = timestamp;
            inherentIds.push(id);
            inhObjs.push(inherent);
          }
        } catch (err) {
          const {section, method} = ex.registry.findMetaCall(ex.callIndex);
          debug(`[BlockProcessor] Call Index: ${ex.callIndex}`);
          debug(`[BlockProcessor] Decoded as: ${section}.${method}`);
          debug(`Type mismatch at index ${i}: ${ex.toRawType()}`);
          debug(`Skipping extrinsic at index ${i} due to conversion error: ${err}`);

        }
      });

      //Save logs separately
      for (let i = 0; i < chainBlock.block.header.digest.logs.length; i++) {
        const id = `${blockNumber}-${i}`;
        const log = {
          id: id,
          index: i,
          log: chainBlock.block.header.digest.logs[i].toHuman(true),
          blockNumber: blockNumber,
          timestamp,
          significant: isSignificantBlock
        };
        logIds.push(id);
        logObjs.push(log);
      }

      const block: FullBlock = {
        number: blockNumber,
        hash: blockHash.toString(),
        parentHash: chainBlock.block.header.parentHash.toString(),
        stateRoot: chainBlock.block.header.stateRoot.toString(),
        extrinsicsRoot: chainBlock.block.header.extrinsicsRoot.toString(),
        timestamp,
        transactions: transactionHashes,
        inherents: inherentIds,
        events: eventIds,
        logs: logIds,
        significant: isSignificantBlock
      };

      const eventRows: EventRow[] = eventObjs.map(evn => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {data, name, pallet, extrinsicHash, ...eventRow} = evn;
        eventRow.significant = isSignificantBlock;
        return eventRow;
      });

      eventRows.forEach(evn => calls.push(this.store.event.save(evn)));

      txObjs.forEach(tx => calls.push(this.store.transaction.save(tx)));
      inhObjs.forEach(inh => calls.push(this.store.inherent.save(inh)));
      logObjs.forEach(log => calls.push(this.store.log.save(log)));
      dids.forEach(did => calls.push(this.store.identity.save(did)));
      didActivities.forEach(didActivity => calls.push(this.store.identity.saveActivity(didActivity)));
      catalogs.forEach(catalog => calls.push(this.store.identity.save(catalog)));
      catalogActivities.forEach(catalogActivity => calls.push(this.store.identity.saveCatalogActivity(catalogActivity)));
      assetRegistries.forEach(assetRegistry => calls.push(this.store.lease.saveRegistry(assetRegistry)));
      assetRegistryActivities.forEach(assetRegistryActivity => calls.push(this.store.lease.saveRegistryActivity(assetRegistryActivity)));
      assets.forEach(asset => calls.push(this.store.lease.saveAsset(asset)));
      assetActivities.forEach(assetActivity => calls.push(this.store.lease.saveAssetActivity(assetActivity)));
      leases.forEach(lease => calls.push(this.store.lease.saveLease(lease)));
      leaseActivities.forEach(leaseActivity => calls.push(this.store.lease.saveLeaseActivity(leaseActivity)));
      audits.forEach(audit => calls.push(this.store.audit.save(audit)));
      auditActivities.forEach(auditActivity => calls.push(this.store.audit.saveActivity(auditActivity)));
      groups.forEach(group => calls.push(this.store.group.save(group)));
      groupActivities.forEach(groupActivity => calls.push(this.store.group.saveActivity(groupActivity)));
      proposals.forEach(proposal => calls.push(this.store.proposal.save(proposal)));
      proposalActivities.forEach(proposalActivity => calls.push(this.store.proposal.saveActivity(proposalActivity)));
      provenanceRegistries.forEach(provenanceRegistry => calls.push(this.store.provenance.saveRegistry(provenanceRegistry)));
      provenanceRegistryActivities.forEach(provenanceRegistryActivity => calls.push(this.store.provenance.saveRegistryActivity(provenanceRegistryActivity)));
      definitions.forEach(definition => calls.push(this.store.provenance.saveDefinition(definition)));
      definitionActivities.forEach(definitionActivity => calls.push(this.store.provenance.saveDefinitionActivity(definitionActivity)));
      sequences.forEach(sequence => calls.push(this.store.provenance.save(sequence)));
      sequenceActivities.forEach(sequenceActivity => calls.push(this.store.provenance.saveActivity(sequenceActivity)));

      calls.push(this.store.block.save(block));


      try {
        await Promise.all(calls);

        const blockExpanded: BlockExpanded = {
          ...block,
          transactions: txObjs.filter((item): item is TransactionRow => item !== null),
          inherents: inhObjs.filter((item): item is FullInherent => item !== null),
          events: eventRows.filter((item): item is EventRow => item !== null),
          logs: logObjs.filter((item): item is LogRow => item !== null),
        };

        return JSON.stringify(blockExpanded);
      } catch (err) {
        debug(`Block ${blockNumber} sync failed. Error: ${err}`);
      }
    } catch (e) {
      debug(`Block ${blockHash} fetch failed. Error: ${e}`);
      throw e;
    }
  }

  toJson(type) {
    return JSON.parse(JSON.stringify(type));
  }
}
