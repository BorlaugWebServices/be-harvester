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
    // // await blockProcessor.subscribeNewHeads();
    blockProcessor.getBlockByHash('0xbe2623c8d469c46c5967b5e478065d8f5b4056a6d77a4ac9be60d547766ec3c4');
    blockProcessor.getBlockByHash('0x47d0b0a27632d7e9810915fb313f74fd30c586d8a6528ad714765527b0fcc0d5');
    blockProcessor.getBlockByHash('0xb4e2e95b7ffaaf77bf97d9aea0bba20d74f0121c1f36dd00345f901a4d2393ad');
    blockProcessor.getBlockByHash('0x7e96c6c95c16bdce09ad4348329a681b18ed63e0a697693fa2772fbf707b8196');
    blockProcessor.getBlockByHash('0x506cf0ead64dc12304cce140422e9a39891aeab6d1d4290d6245f58dd4893def');
    blockProcessor.getBlockByHash('0x96d2264252ea991ff3838c8ec282c1896098ed09558463b7fe383d963e3da81f');
    blockProcessor.getBlockByHash('0x4cac90231adcd34d03ad1a9336358d65710341bdbe4705ec17dd4d2214f8e180');
    blockProcessor.getBlockByHash('0xeae17e431a245fd140c0283a4faca7c4e517888018d58b6d9668b0c28905a03d');
    blockProcessor.getBlockByHash('0xcff004bcfce751d8d0ccb7b049c6ef4f0bc8ccb0e016327414f41be4be9ff901');
}

debug("Harvester started");

main().catch(console.error);