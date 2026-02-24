import {ApiPromise, WsProvider} from "@polkadot/api";
import {ADDAX_ADDRESS} from "#config";
import Debug from "debug";
import {EventFull} from "#types";
import mayaSchema from "./schemas/maya-schema.json" with {type: "json"};

const debug = Debug("be-harvester:api");

export interface PalletMetadata {
    pallet: string;
    events: PalletEvent[];
}

interface PalletField {
    name: string;
    type: string;
}

interface PalletEvent {
    name: string;
    fields: PalletField[];
}

export class ApiSingleton {
    private static instance: ApiPromise;
    private static initPromise: Promise<ApiPromise> | null = null;
    public static palletMetadata: PalletMetadata[] = [];
    public static isMaya = false;

    public static async getInstance(): Promise<ApiPromise> {
        if (this.instance) return this.instance;
        if (this.initPromise) return this.initPromise;
        this.initPromise = (async () => {
            const provider = new WsProvider(ADDAX_ADDRESS);
            await new Promise((resolve, reject) => {
                if (provider.isConnected) return resolve(true);
                provider.on('connected', () => resolve(true));
                provider.on('error', (err) => reject(err));
            });
            const rawMetadata = await provider.send('state_getMetadata', []);
            const versionHex = rawMetadata.slice(10, 12);
            const version = parseInt(versionHex, 16);
            debug(`Metadata version: ${version}`);
            this.isMaya = (version < 14);
            if (this.isMaya) {
                debug(`Maya detected. Using maya-schema.json for type definitions.`);
            }
            const api = await ApiPromise.create({
                provider,
                types: this.isMaya ? mayaSchema : {},
                throwOnConnect: true
            });
            await api.isReady;
            const metadata = await api.rpc.state.getMetadata();

            debug(`Metadata Version from getMetadata: ${metadata.version}`);
            const latest = metadata.asLatest;
            this.palletMetadata = latest.pallets.map(pallet => {
                const palletName = pallet.name.toString();
                let events: PalletEvent[] = [];
                if (pallet.events.isSome) {
                    const eventLookupId = pallet.events.unwrap().type;
                    const typeMetadata = api.registry.lookup.getSiType(eventLookupId);
                    events = typeMetadata.def.asVariant.variants.map((variant) => {
                        const docs = variant.docs.map(d => d.toString().trim());
                        const docNames = docs.length > 0
                            ? docs.find(d => d.includes('('))?.match(/\(([^)]+)\)/)?.[1].split(',').map(s => s.trim())
                            : null;
                        return {
                            name: variant.name.toString(),
                            fields: variant.fields.map((f, index) => {
                                const rawName = f.typeName.isSome
                                    ? f.typeName.unwrap().toString()
                                    : api.registry.lookup.getTypeDef(f.type).type;
                                let finalName = 'unnamed';
                                if (f.name.isSome) {
                                    finalName = f.name.toString();
                                } else if (docNames && docNames[index]) {
                                    finalName = docNames[index].replace(/[`'"]/g, '');
                                }
                                return {
                                    name: finalName,
                                    type: rawName.replace(/T::/g, '').replace(/<.*>::/g, '')
                                };
                            })
                        };
                    });
                }
                return {
                    pallet: palletName,
                    events
                };
            });

            this.palletMetadata.forEach(p => {
                if (p.events.length > 0) {
                    debug(`\n📦 Pallet: ${p.pallet}`);
                    p.events.forEach(e => {
                        debug(`  ✨ ${e.name}(${e.fields.map(field => `${field.name}:${field.type}`).join(', ')})`);
                    });
                }
            });


            this.instance = api;
            return api;
        })();
        return this.initPromise;
    }

    public static getEventData(event: EventFull, fieldName: string) {
        const pallet = this.palletMetadata.find(
            p => p.pallet.toLowerCase() === event.pallet.toLowerCase()
        );
        const eventMetadata = pallet?.events.find(e => e.name === event.name);
        const index = eventMetadata?.fields.findIndex(
            field => field.name.toLowerCase().includes(fieldName.toLowerCase())
        );
        if (index !== undefined && index !== -1 && event.data[index]) {
            const data = event.data[index];
            // Custom decoding for 'Did' type defined in maya-schema.json
            // Based on your schema, Did is { "id": "[u8; 32]" }
            if (eventMetadata?.fields[index].type === 'Did' || fieldName.toLowerCase() === 'did') {
                return data.id ? data.id.toString() : data.toString();
            }

            return data.toString();
        }
        return null;
    }
}