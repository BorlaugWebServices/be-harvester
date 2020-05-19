/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-var-requires */
const debug = require("debug")("be-harvester");

import BlockProcessor from "./BlockProcessor";
import {server} from "./rpc";
import {RPC_PORT} from "./config";

console.log("Starting harvester");
server.http().listen(RPC_PORT);

async function main() {
    const blockProcessor = new BlockProcessor();
    await blockProcessor.getBlock(518239);
    // await blockProcessor.getBlock(518873);
    // await blockProcessor.subscribeNewHeads();
}

console.log("Harvester started");

main().catch(console.error);