import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('profile_models', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
        table.string('model_id').notNullable();
        table.string('name');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['profile_id', 'model_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('profile_models');
}
