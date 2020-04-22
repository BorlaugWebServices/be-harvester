# be-harvester

Listen to blocks and transactions and writes to database and cache

### Configuration

Add `.env` file in project root and set web and api urls, e.g.
```
ADDAX_ADDRESS=ws://127.0.0.1:9944
RPC_PORT=4000
API_URL=https://127.0.0.1:3000
DB_CONNECTION_TYPE=pg
DB_CONNECTION_URL=postgres://postgres:mysecretpassword@localhost:5432/borlaug
REDIS_HOSTS=127.0.0.1,127.0.0.1,127.0.0.1,127.0.0.1,127.0.0.1,127.0.0.1
REDIS_PORTS=7000,7001,7002,7003,7004,7005
CACHE_EXPIRY=7776000
```