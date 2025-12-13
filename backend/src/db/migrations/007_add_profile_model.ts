import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('profiles', (table) => {
        table.string('model');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('profiles', (table) => {
        table.dropColumn('model');
    });
}
