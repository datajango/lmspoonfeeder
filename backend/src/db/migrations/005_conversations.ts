import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('conversations', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.string('title').notNullable();
        table.string('provider').notNullable();
        table.string('model').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('messages', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
        table.enum('role', ['user', 'assistant', 'system']).notNullable();
        table.text('content').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());

        table.index('conversation_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('messages');
    await knex.schema.dropTableIfExists('conversations');
}
