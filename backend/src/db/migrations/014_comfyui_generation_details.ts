import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ============================================
    // ENHANCE comfyui_generations TABLE
    // ============================================
    await knex.schema.alterTable('comfyui_generations', (table) => {
        // Complete workflow snapshot for reproducibility
        table.text('workflow_json_snapshot');

        // All parameters as structured JSON
        table.jsonb('parameters').defaultTo('{}');

        // Prompt details
        table.text('negative_prompt');

        // Denormalized generation settings (for easy querying)
        table.integer('width');
        table.integer('height');
        table.integer('steps');
        table.float('cfg_scale');
        table.bigInteger('seed');
        table.string('sampler_name', 50);
        table.string('scheduler', 50);
        table.integer('batch_size').defaultTo(1);

        // Model information
        table.string('checkpoint_name', 255);
        table.jsonb('loras_used').defaultTo('[]');

        // Performance metrics
        table.float('generation_time_seconds');

        // Batch tracking
        table.integer('batch_index').defaultTo(0);

        // Indexes for common queries
        table.index('seed');
        table.index('checkpoint_name');
        table.index(['session_id', 'created_at']);
    });

    // ============================================
    // ENHANCE comfyui_workflows TABLE
    // ============================================
    await knex.schema.alterTable('comfyui_workflows', (table) => {
        // Default parameters for this workflow
        table.jsonb('default_parameters').defaultTo('{}');

        // Cached extracted parameter definitions
        table.jsonb('extracted_parameters').defaultTo('[]');

        // Workflow metadata
        table.string('thumbnail_url', 500);
        table.boolean('is_default').defaultTo(false);
        table.integer('generation_count').defaultTo(0);
    });

    // ============================================
    // ENHANCE comfyui_sessions TABLE
    // ============================================
    await knex.schema.alterTable('comfyui_sessions', (table) => {
        // Currently selected workflow for this session
        table.uuid('current_workflow_id')
            .references('id')
            .inTable('comfyui_workflows')
            .onDelete('SET NULL');

        // Last used parameters (for session continuity)
        table.jsonb('last_parameters').defaultTo('{}');

        // Session statistics
        table.integer('generation_count').defaultTo(0);
        table.integer('completed_count').defaultTo(0);
        table.integer('failed_count').defaultTo(0);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('comfyui_generations', (table) => {
        table.dropIndex('seed');
        table.dropIndex('checkpoint_name');
        table.dropIndex(['session_id', 'created_at']);
        table.dropColumn('workflow_json_snapshot');
        table.dropColumn('parameters');
        table.dropColumn('negative_prompt');
        table.dropColumn('width');
        table.dropColumn('height');
        table.dropColumn('steps');
        table.dropColumn('cfg_scale');
        table.dropColumn('seed');
        table.dropColumn('sampler_name');
        table.dropColumn('scheduler');
        table.dropColumn('batch_size');
        table.dropColumn('checkpoint_name');
        table.dropColumn('loras_used');
        table.dropColumn('generation_time_seconds');
        table.dropColumn('batch_index');
    });

    await knex.schema.alterTable('comfyui_workflows', (table) => {
        table.dropColumn('default_parameters');
        table.dropColumn('extracted_parameters');
        table.dropColumn('thumbnail_url');
        table.dropColumn('is_default');
        table.dropColumn('generation_count');
    });

    await knex.schema.alterTable('comfyui_sessions', (table) => {
        table.dropForeign(['current_workflow_id']);
        table.dropColumn('current_workflow_id');
        table.dropColumn('last_parameters');
        table.dropColumn('generation_count');
        table.dropColumn('completed_count');
        table.dropColumn('failed_count');
    });
}

