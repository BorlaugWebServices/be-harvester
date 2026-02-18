import Debug from "debug";
import {BlockProcessor} from "#blockProcessor";
import {server} from "#rpc";
import {RPC_PORT} from "#config";

const debug = Debug("be-harvester:Main");

debug("Starting harvester");

server.http().listen(RPC_PORT);

async function main() {
    const blockProcessor = new BlockProcessor();
    await blockProcessor.subscribeNewHeads();
}

debug("Harvester started");

main().catch(console.error);