import {EventRow} from "be-datastore/dist/lib/dbTypes";


export type PalletNames = 'assetRegistry'
  | 'identity'
  | 'groups'
  | 'audit'
  | 'provenance'

export interface EventFull extends EventRow {
  pallet: PalletNames;
  name: string;
  data: any[];
  extrinsicHash: string;
  extrinsicid: string;
}

export interface HumanEvent {
  method: string;
  section: string;
  index: string;
  data: any[];
}
