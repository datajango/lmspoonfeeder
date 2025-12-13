import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('profiles', (table) => {
        table.text('input_modalities').defaultTo('["text"]');
        table.text('output_modalities').defaultTo('["text"]');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('profiles', (table) => {
        table.dropColumn('input_modalities');
        table.dropColumn('output_modalities');
    });
}
