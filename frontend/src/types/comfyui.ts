// ============================================================
// ComfyUI Types
// ============================================================

export interface LoraConfig {
    name: string;
    strength_model: number;
    strength_clip: number;
}

export interface GenerationParameters {
    width: number;
    height: number;
    steps: number;
    cfg_scale: number;
    seed: number;                    // -1 for random
    sampler_name: string;
    scheduler: string;
    batch_size: number;
    checkpoint_name?: string;
    loras?: LoraConfig[];
    [key: string]: any;              // Workflow-specific params
}

export interface WorkflowParameter {
    nodeId: string;
    field: string;
    label: string;
    type: 'string' | 'number' | 'seed' | 'select';
    value: any;
    options?: (string | number)[];
    min?: number;
    max?: number;
}

export interface ComfyUIWorkflow {
    id: string;
    profile_id?: string;
    name: string;
    description?: string;
    workflow_json: string;
    default_parameters: GenerationParameters;
    extracted_parameters: WorkflowParameter[];
    thumbnail_url?: string;
    is_default: boolean;
    generation_count: number;
    created_at: string;
    updated_at: string;
}

export interface ComfyUISession {
    id: string;
    profile_id: string;
    profile_name?: string;
    profile_url?: string;
    title: string;
    current_workflow_id?: string;
    workflow_name?: string;
    last_parameters: GenerationParameters;
    generation_count: number;
    completed_count: number;
    failed_count: number;
    created_at: string;
    updated_at: string;
}

export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ComfyUIGeneration {
    id: string;
    session_id: string;
    workflow_id?: string;
    workflow_json_snapshot?: string;
    prompt_id?: string;
    prompt_text: string;
    negative_prompt?: string;
    parameters: GenerationParameters;

    // Denormalized fields
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
    sampler_name?: string;
    scheduler?: string;
    batch_size: number;
    checkpoint_name?: string;
    loras_used: LoraConfig[];

    status: GenerationStatus;
    outputs: Array<{ filename: string; subfolder: string; type: string }>;
    error?: string;
    generation_time_seconds?: number;
    batch_index: number;
    created_at: string;
    completed_at?: string;
}

export interface CreateGenerationRequest {
    workflow_id?: string;
    workflow_json?: object;
    prompt_text: string;
    negative_prompt?: string;
    parameters: Partial<GenerationParameters>;
}

export interface ComfyUIOptions {
    samplers: string[];
    schedulers: string[];
    checkpoints: string[];
    loras: string[];
    dimensions: {
        common: number[];
        sdxl_optimal: Array<{ width: number; height: number; label: string }>;
    };
}

// Default generation parameters
export const DEFAULT_GENERATION_PARAMETERS: GenerationParameters = {
    width: 512,
    height: 512,
    steps: 20,
    cfg_scale: 7.0,
    seed: -1,
    sampler_name: 'euler',
    scheduler: 'normal',
    batch_size: 1,
};

// Common samplers available in ComfyUI
export const SAMPLER_OPTIONS = [
    'euler',
    'euler_ancestral',
    'heun',
    'heunpp2',
    'dpm_2',
    'dpm_2_ancestral',
    'lms',
    'dpm_fast',
    'dpm_adaptive',
    'dpmpp_2s_ancestral',
    'dpmpp_sde',
    'dpmpp_sde_gpu',
    'dpmpp_2m',
    'dpmpp_2m_sde',
    'dpmpp_2m_sde_gpu',
    'dpmpp_3m_sde',
    'dpmpp_3m_sde_gpu',
    'ddpm',
    'lcm',
    'ddim',
    'uni_pc',
    'uni_pc_bh2',
] as const;

// Common schedulers available in ComfyUI
export const SCHEDULER_OPTIONS = [
    'normal',
    'karras',
    'exponential',
    'sgm_uniform',
    'simple',
    'ddim_uniform',
    'beta',
] as const;

// Common dimension options
export const DIMENSION_OPTIONS = [512, 768, 1024, 1280, 1536, 2048] as const;

// SDXL optimal dimensions
export const SDXL_DIMENSIONS = [
    { width: 1024, height: 1024, label: '1:1 Square' },
    { width: 1152, height: 896, label: '9:7 Landscape' },
    { width: 896, height: 1152, label: '7:9 Portrait' },
    { width: 1216, height: 832, label: '3:2 Landscape' },
    { width: 832, height: 1216, label: '2:3 Portrait' },
    { width: 1344, height: 768, label: '16:9 Landscape' },
    { width: 768, height: 1344, label: '9:16 Portrait' },
] as const;
