/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-var-requires */
const debug = require("debug")("be-harvester:Main");

import BlockProcessor from "./BlockProcessor";
import {server} from "./rpc";
import {RPC_PORT} from "./config";

console.log("Starting harvester");
debug("Starting harvester");

server.http().listen(RPC_PORT);

async function main() {
    const blockProcessor = new BlockProcessor();
    await blockProcessor.subscribeNewHeads();
}

console.log("Harvester started");
debug("Harvester started");

main().catch(console.error);