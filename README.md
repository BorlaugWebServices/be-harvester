# be-harvester

Listen to blocks and transactions and writes to database and cache

### Configuration

Add `.env` file in project root and set web and api urls, e.g.
```
ADDAX_ADDRESS=ws://localhost:9944
RPC_PORT=4000
API_URL=https://127.0.0.1:3000
DATABASE_TYPE=pg
DATABASE_SERVER=postgres://postgres:mysecretpassword@localhost:5432
DATABASE=borlaug
REDIS_SERVER=127.0.0.1:6379
TTL_MIN=300
TTL_MAX=31556952
TYPES={"Address":"AccountId","LookupSource":"AccountId","Balance":"u128","Timestamp":"u64","Moment":"u64","CatalogId":"u32","RegistryId":"u32","AssetId":"u32","LeaseId":"u32","Did":{"id":"[u8; 32]"},"ClaimIndex":"u64","Claim":{"description":"Vec<u8>","statements":"Vec<Statement>","created_by":"Did","attestation":"Option<Attestation>"},"Statement":{"name":"Vec<u8>","fact":"Fact","for_issuer":"bool"},"Fact":{"_enum":{"Bool":"bool","Text":"Vec<u8>","U8":"u8","U16":"u16","U32":"u32","U128":"u128","Date":"(u16, u8, u8)","Iso8601":"(u8, u8, u8, u8, u8, u8, Vec<u8>)"}},"DidDocument":{"properties":"Vec<DidProperty>"},"DidProperty":{"name":"Vec<u8>","fact":"Fact"},"Attestation":{"attested_by":"Did","valid_until":"Timestamp"},"Asset":{"properties":"Option<Vec<AssetProperty>>","name":"Option<Vec<u8>>","asset_number":"Option<Vec<u8>>","status":"Option<AssetStatus>","serial_number":"Option<Vec<u8>>","total_shares":"Option<u64>","residual_value":"Option<Balance>","purchase_value":"Option<Balance>","acquired_date":"Option<Timestamp>"},"AssetProperty":{"name":"Vec<u8>","fact":"Fact"},"LeaseAgreement":{"contract_number":"Vec<u8>","lessor":"Did","lessee":"Did","effective_ts":"Timestamp","expiry_ts":"Timestamp","allocations":"Vec<AssetAllocation>"},"AssetAllocation":{"registry_id":"RegistryId","asset_id":"AssetId","allocated_shares":"u64"},"AssetStatus":{"_enum":["Draft","Active","InActive"]},"ClaimConsumer":{"consumer":"Did","expiration":"Moment"},"ClaimIssuer":{"issuer":"Did","expiration":"Moment"},"DidPropertyName":"Vec<u8>","ShortName":"Vec<u8>","AuditId":"u32","AuditStatus":{"_enum":["Requested","Accepted","Rejected","InProgress","Completed"]},"AuditCreatorId":"AccountId","AuditorId":"AccountId","Audit":{"status":"AuditStatus","audit_creator":"AuditCreatorId","auditor":"AuditorId"},"ControlPointId":"u32","ObservationId":"u32","Observation":{"compliance":"Option<Compliance>","procedural_note":"Option<[u8; 32]>"},"Compliance":{"_enum":["NotApplicable","Compliant","NonCompliant"]},"EvidenceId":"u32","Evidence":{"name":"Vec<u8>","content_type":"Vec<u8>","url":"Option<Vec<u8>>","hash":"Vec<u8>"}}
```