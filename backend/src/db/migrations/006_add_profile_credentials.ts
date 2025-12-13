import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('profiles', (table) => {
        table.text('api_key');
        table.string('url');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('profiles', (table) => {
        table.dropColumn('api_key');
        table.dropColumn('url');
    });
}
