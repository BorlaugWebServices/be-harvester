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
        debug("In Group -  process:", transaction.method.method);
        if (transaction.method.section !== 'groups') {
            throw new Error("Not an group transaction");
        }

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
        } else if (['updateGroup', 'createSubGroup', 'updateSubGroup', 'removeGroup', 'removeSubGroup', 'execute'].includes(transaction.method.method)) {
            let events = _.filter(_events, (e) => {
                return (['GroupUpdated', 'GroupRemoved', 'SubGroupCreated', 'SubGroupUpdated', 'SubGroupRemoved', 'GroupMembersExceeded', 'Executed']).includes(e.meta.name.toString());
            });
            let group_id = null;
            if (events.length > 0) {
                group_id = Number(events[0].event.data[0].toString());
            }
            return {
                group_id,
                tx_hash: transaction.hash
            }
        } else {
            // throw new Error("Method not recognized");
            debug("Method not recognized");
        }
    }
}
