import { knex} from "./index";

export async function up(): Promise<any> {
    return Promise.all([
        knex.schema.createTable('block', (table) => {
            table.integer('number').primary().unsigned();
            table.string('hash').notNullable();
            table.string('parentHash');
            table.string('stateRoot');
            table.string('extrinsicsRoot');
            table.bigInteger('timestamp').unsigned();
        }),
        knex.schema.createTable('transaction', (table) => {
            table.string('hash').primary().unsigned();
            table.string('id').notNullable();
            table.integer('index').unsigned();
            table.integer('blockNumber').notNullable().unsigned();
            table.string('signature');
            table.boolean('isSigned');
            table.json('method');
            table.json('era');
            table.string('tip');
        }),
        knex.schema.createTable('inherent', (table) => {
            table.string('id').primary().unsigned();
            table.integer('index').unsigned();
            table.integer('blockNumber').notNullable().unsigned();
            table.boolean('isSigned');
            table.json('method');
        }),
        knex.schema.createTable('event', (table) => {
            table.string('id').primary().unsigned();
            table.integer('index').unsigned();
            table.integer('blockNumber').notNullable().unsigned();
            table.string('extrinsicid');
            table.json('phase');
            table.json('meta');
            table.json('event');
        }),
        knex.schema.createTable('log', (table) => {
            table.string('id').primary().unsigned();
            table.integer('index').unsigned();
            table.integer('blockNumber').notNullable().unsigned();
            table.json('log');
        }),
        knex.schema.createTable('lease', (table) => {
            table.string('id').primary().unsigned();
            table.integer('blockNumber').notNullable().unsigned();
            table.string('blockHash').notNullable().unsigned();
            table.string('extrinsicHash').notNullable().unsigned();
            table.string('contract_number'),
            table.json('lessor');
            table.json('lessee');
            table.string('effective_ts');
            table.string('expiry_ts');
        })
    ]);
}

export async function down(): Promise<any> {
    return Promise.all([
        knex.schema.dropTable('lease'),
        knex.schema.dropTable('log'),
        knex.schema.dropTable('event'),
        knex.schema.dropTable('inherent'),
        knex.schema.dropTable('transaction'),
        knex.schema.dropTable('block')
    ]);
}

