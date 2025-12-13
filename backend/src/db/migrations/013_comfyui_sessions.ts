import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ComfyUI Sessions table - groups generations like conversations
    await knex.schema.createTable('comfyui_sessions', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('profile_id').references('id').inTable('profiles').onDelete('CASCADE');
        table.string('title').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Add session_id to generations and make workflow_id nullable
    await knex.schema.alterTable('comfyui_generations', (table) => {
        table.uuid('session_id').references('id').inTable('comfyui_sessions').onDelete('CASCADE');
        table.text('prompt_text'); // Store the original prompt text
    });

    // Make workflow_id nullable for direct prompt submissions
    await knex.raw(`
        ALTER TABLE comfyui_generations 
        ALTER COLUMN workflow_id DROP NOT NULL
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('comfyui_generations', (table) => {
        table.dropColumn('session_id');
        table.dropColumn('prompt_text');
    });
    await knex.schema.dropTableIfExists('comfyui_sessions');
}
