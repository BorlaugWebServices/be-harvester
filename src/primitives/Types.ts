export const Types = {
    "Balance": "u128",
    "Timestamp": "u64",
    "Moment": "u64",
    "CatalogId": "u32",
    "RegistryId": "u32",
    "AssetId": "u32",
    "LeaseId": "u32",
    "Did": {
        "id": "[u8; 32]"
    },
    "ClaimIndex": "u64",
    "Claim": {
        "id": "ClaimIndex",
        "description": "Vec<u8>",
        "statements": "Vec<Statement>",
        "created_by": "Did",
        "attestation": "Option<Attestation>"
    },
    "Statement": {
        "name": "Vec<u8>",
        "fact": "Fact",
        "for_issuer": "bool"
    },
    "Fact": {
        "_enum": {
            "Bool": "bool",
            "Text": "Vec<u8>",
            "U8": "u8",
            "U16": "u16",
            "U32": "u32",
            "U128": "u128",
            "Date": "(u16, u8, u8)",
            "Iso8601": "(u8, u8, u8, u8, u8, u8, Vec<u8>)"
        }
    },
    "DidDocument": {
        "properties": "Vec<DidProperty>"
    },
    "DidProperty": {
        "name": "Vec<u8>",
        "fact": "Fact"
    },
    "Attestation": {
        "attested_by": "Did",
        "valid_until": "Timestamp"
    },
    "Asset": {
        "asset_id": "Option<AssetId>",
        "properties": "Option<Vec<AssetProperty>>",
        "name": "Option<Vec<u8>>",
        "asset_number": "Option<Vec<u8>>",
        "status": "Option<AssetStatus>",
        "serial_number": "Option<Vec<u8>>",
        "total_shares": "Option<u64>",
        "residual_value": "Option<Balance>",
        "purchase_value": "Option<Balance>",
        "acquired_date": "Option<Timestamp>"
    },
    "AssetProperty": {
        "name": "Vec<u8>",
        "fact": "Fact"
    },
    "LeaseAgreement": {
        "lease_id": "Option<LeaseId>",
        "contract_number": "Vec<u8>",
        "lessor": "Did",
        "lessee": "Did",
        "effective_ts": "Timestamp",
        "expiry_ts": "Timestamp",
        "allocations": "Vec<AssetAllocation>"
    },
    "AssetAllocation": {
        "registry_id": "RegistryId",
        "asset_id": "AssetId",
        "allocated_shares": "u64"
    },
    "AssetStatus": {
        "_enum": [
            "Draft",
            "Active",
            "InActive"
        ]
    },
    "ClaimConsumer": {
        "consumer": "Did",
        "expiration": "Moment"
    },
    "ClaimIssuer": {
        "issuer": "Did",
        "expiration": "Moment"
    },
    "DidPropertyName": "Vec<u8>",
    "ShortName": "Vec<u8>",
    "Address":"AccountId",
    "LookupSource":"AccountId",
    "AuditId": "u32",
    "ControlPointId": "u32",
    "ObservationId": "u32",
    "EvidenceId": "u32",
    "Observation": {
        "observation_id": "Option<ObservationId>",
        "compliance": "Option<Compliance>",
        "procedural_note": "Option<[u8; 32]>"
    },
    "Compliance": {
        "_enum": [
            "NotApplicable",
            "Compliant",
            "NonCompliant"
        ]
    }
};