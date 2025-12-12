import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('provider_settings', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('provider').unique().notNullable();
        table.text('api_key').notNullable();
        table.string('endpoint_url');
        table.string('default_model');
        table.timestamp('last_tested');
        table.string('status').defaultTo('unknown');
        table.text('error_message');
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('provider_settings');
}
