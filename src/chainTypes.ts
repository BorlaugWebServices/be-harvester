/** * Base Substrate Types (Human-readable format)
 */
export type AccountId = string;
export type Balance = string;
export type Moment = string;
export type BlockNumber = number | string;
export type H256 = string;

/**
 * Common IDs and Primitive Aliases
 */
export type RegistryId = number;
export type AssetId = number;
export type LeaseId = number;
export type ClaimId = number;
export type DefinitionId = number;
export type ProcessId = number;
export type GroupId = number;
export type ProposalId = number;
export type MemberCount = number;
export type AuditId = number;
export type ControlPointId = number;
export type ObservationId = number;
export type EvidenceId = number;

/**
 * Identity & Fact Types
 */
export type DidId = { id: string };

export interface Fact {
    Bool?: boolean;
    Text?: string;
    Attachment?: [H256, string]; // (Hash, Hex/Vec<u8>)
    Location?: [number, number]; // (u32, u32)
    Did?: DidId;
    Float?: string; // [u8; 8] as hex/string
    U8?: number;
    U16?: number;
    U32?: number;
    U128?: string;
    Date?: [number, number, number]; // (Year, Month, Day)
    Iso8601?: [number, number, number, number, number, number, string];
}

export interface Statement {
    name: string;
    fact: Fact;
    for_issuer: boolean;
}

export interface Claim {
    description: string;
    statements: Statement[];
    created_by: AccountId;
    attestation?: {
        attested_by: AccountId;
        issued: Moment;
        valid_until: Moment;
    };
    threshold: MemberCount;
}

export interface ClaimConsumer {
    consumer: AccountId;
    expiration: Moment;
}

export interface ClaimIssuer {
    issuer: AccountId;
    expiration: Moment;
}

export interface DidProperty {
    name: string;
    fact: Fact;
}

/**
 * Governance & Group Types
 */
export interface Group {
    name: string;
    total_vote_weight: MemberCount;
    threshold: MemberCount;
    anonymous_account: AccountId;
    parent?: GroupId;
}

export interface GroupMember<A, W> {
    who: A;
    weight: W;
}

export interface Votes {
    threshold: MemberCount;
    total_vote_weight: MemberCount;
    ayes: GroupMember<AccountId, MemberCount>[];
    nays: GroupMember<AccountId, MemberCount>[];
    veto?: boolean;
}

/**
 * Asset Registry Pallet Types
 */
export type AssetStatus = 'Draft' | 'Active' | 'InActive';

export interface Registry {
    name: string;
}

export interface AssetProperty {
    name: string;
    fact: Fact;
}

export interface Asset {
    properties: AssetProperty[];
    name: string;
    asset_number?: string;
    status: AssetStatus;
    serial_number?: string;
    total_shares: string;
    residual_value?: Balance;
    purchase_value?: Balance;
    acquired_date?: Moment;
}

export interface AssetAllocation {
    registry_id: RegistryId;
    asset_id: AssetId;
    allocated_shares: string;
}

export interface LeaseAgreement {
    proposal_id?: ProposalId;
    contract_number: string;
    lessor: DidId;
    lessee: DidId;
    effective_ts: Moment;
    expiry_ts: Moment;
    allocations: AssetAllocation[];
}

/**
 * Audit Pallet Types
 */
export type AuditStatus = 'Requested' | 'Accepted' | 'Rejected' | 'InProgress' | 'Completed';
export type Compliance = 'NotApplicable' | 'Compliant' | 'NonCompliant';

export interface Audit {
    proposal_id: ProposalId;
    status: AuditStatus;
    audit_creator: AccountId;
    auditing_org: AccountId;
    auditors?: AccountId;
}

export interface Observation {
    proposal_id: ProposalId;
    compliance?: Compliance;
    procedural_note_hash?: string;
}

export interface Evidence {
    proposal_id: ProposalId;
    name: string;
    content_type: string;
    url?: string;
    hash: string;
}

/**
 * Provenance / Process Pallet Types
 */
export type DefinitionStatus = 'Active' | 'Inactive';
export type ProcessStatus = 'InProgress' | 'Completed';

export interface Definition {
    name: string;
    status: DefinitionStatus;
}

export interface Process {
    name: string;
    status: ProcessStatus;
}

export interface Attribute {
    name: string;
    fact: Fact;
}

export interface ProcessStep {
    proposal_id?: ProposalId;
    attested: Moment;
    attributes: Attribute[];
}

export interface DefinitionStep {
    name: string;
    attestor: AccountId;
    required: boolean;
    threshold: MemberCount;
}