/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-var-requires */
const debug = require("debug")("watcher");

import BlockProcessor from "./BlockProcessor";
import {server} from "./rpc";
import {RPC_PORT} from "./config";

console.log("Starting watcher");
server.http().listen(RPC_PORT);

async function main() {
    const blockProcessor = new BlockProcessor();
    //await blockProcessor.subscribeNewHeads();
    await blockProcessor.getBlock(20928);
}

console.log("watcher started");

main().catch(console.error);