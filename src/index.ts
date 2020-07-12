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
    // await blockProcessor.subscribeNewHeads();
    await blockProcessor.getBlockByNumber(192555);
    await blockProcessor.getBlockByNumber(193451);
    await blockProcessor.getBlockByNumber(194607);
    await blockProcessor.getBlockByNumber(194623);
}

debug("Harvester started");

main().catch(console.error);