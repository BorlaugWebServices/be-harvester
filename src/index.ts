/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-var-requires */
const debug = require("debug")("be-harvester:Main");

import BlockProcessor from "./BlockProcessor";
import {server} from "./rpc";
import {RPC_PORT} from "./config";

debug("Starting harvester");

server.http().listen(RPC_PORT);

async function main() {
    const blockProcessor = new BlockProcessor();
    await blockProcessor.subscribeNewHeads();
    // await blockProcessor.getBlockByNumber(327730);
    // await blockProcessor.getBlockByNumber(333204);
    // await blockProcessor.getBlockByNumber(334031);
    // await blockProcessor.getBlockByNumber(334039);
    // await blockProcessor.getBlockByNumber(334054);
    // await blockProcessor.getBlockByNumber(334058);
    // await blockProcessor.getBlockByNumber(334081);
    // await blockProcessor.getBlockByNumber(334086);
    // await blockProcessor.getBlockByNumber(334110);
    // await blockProcessor.getBlockByNumber(334128),
    // await blockProcessor.getBlockByNumber(334135);


}

debug("Harvester started");

main().catch(console.error);