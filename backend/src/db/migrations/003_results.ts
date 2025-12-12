import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('results', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('task_id').unique().references('id').inTable('tasks').onDelete('CASCADE');
        table.string('type').notNullable();
        table.text('content').notNullable();
        table.jsonb('metadata');
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('results');
}
