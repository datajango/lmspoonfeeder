import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ComfyUI Workflows table
    await knex.schema.createTable('comfyui_workflows', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('profile_id').references('id').inTable('profiles').onDelete('CASCADE');
        table.string('name').notNullable();
        table.text('description');
        table.text('workflow_json').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // ComfyUI Generations table
    await knex.schema.createTable('comfyui_generations', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('workflow_id').references('id').inTable('comfyui_workflows').onDelete('CASCADE');
        table.string('prompt_id'); // ComfyUI's prompt_id
        table.string('status').defaultTo('pending'); // pending, running, completed, failed
        table.text('outputs'); // JSON array of output images
        table.text('error'); // Error message if failed
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('completed_at');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('comfyui_generations');
    await knex.schema.dropTableIfExists('comfyui_workflows');
}
