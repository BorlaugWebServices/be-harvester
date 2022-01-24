const debug = require("debug")("be-harvester:proposal");

export default class Proposal {

    private store;
    private api;

    constructor(store, api) {
        this.store = store;
        this.api = api;
    }

    /**
     * checks transaction with `proposal` module and creates/updates a identity object
     */
    async process(transaction, events, blockNumber, blockHash) {
        debug("In Proposal - process: ", JSON.stringify(transaction));
        let event = events[0];
        debug("In Proposal - events: ", JSON.stringify(event));
        if (event.meta.name.toString() === 'Proposed') {
            let proposer = event.event.data[0].toString();
            let group_id = event.event.data[1].toString();
            let id = event.event.data[2].toString();

            return {
                id,
                proposer,
                group_id,
                blockNumber,
                blockHash,
                extrinsicHash: transaction.hash
            }
        } else if((['Voted', 'ApprovedByVeto', 'DisapprovedByVeto']).includes(event.meta.name.toString())) {
            let proposal_id = Number(event.event.data[2].toString());

            return {
                proposal_id,
                tx_hash: transaction.hash
            }
        } else {
            let proposal_id = Number(event.event.data[1].toString());

            return {
                proposal_id,
                tx_hash: transaction.hash
            }

        }
    }
}
