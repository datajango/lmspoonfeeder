import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('tasks', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable();
        table.string('type').notNullable();
        table.string('provider').notNullable();
        table.text('prompt').notNullable();
        table.jsonb('options');
        table.string('status').defaultTo('pending');
        table.integer('progress').defaultTo(0);
        table.text('error');
        table.timestamps(true, true);
        table.timestamp('completed_at');

        // Indexes for common queries
        table.index('status');
        table.index('type');
        table.index('provider');
        table.index('created_at');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('tasks');
}
