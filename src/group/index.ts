import _ from "lodash";

const debug = require("debug")("be-harvester:group");

export default class Group {

    private store;
    private api;

    constructor(store, api) {
        this.store = store;
        this.api = api;
    }

    /**
     * checks transaction with `group` module and creates/updates a identity object
     */
    async process(transaction, _events, blockNumber, blockHash) {
        debug("In Group -  method:", transaction.method.method);
        debug("In Group -  section:", transaction.method.section);
        if (transaction.method.section !== 'groups') {
            throw new Error("Not an group transaction");
        }

        debug('Events', JSON.stringify(_events))
        if (transaction.method.method === 'createGroup') {
            debug('createGroup');

            let events = _.filter(_events, (e) => {
                return e.meta.name.toString() === 'GroupCreated';
            });
            debug("In Group - events: ", events)

            if (events.length > 0) {
                let event = events[0];
                let group_creator = event.event.data[0].toString();
                let id = Number(event.event.data[1].toString());

                return {
                    id,
                    group_creator,
                    blockNumber,
                    blockHash,
                    extrinsicHash: transaction.hash
                }
            } else {
                throw new Error(`GroupCreated Event not found`);
            }
        } else {
            let events = _.filter(_events, (e) => {
                return (['GroupUpdated', 'GroupRemoved', 'SubGroupCreated', 'SubGroupUpdated', 'SubGroupRemoved', 'GroupMembersExceeded', 'Executed']).includes(e.meta.name.toString());
            });
            if (events.length > 0) {
                let group_id = Number(events[0].event.data[0].toString());
                return {
                    group_id,
                    tx_hash: transaction.hash
                }
            }else {
                debug("Not a group activity");
            }
        }
    }
}
