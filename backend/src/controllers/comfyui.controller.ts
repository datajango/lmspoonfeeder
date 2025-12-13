import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';

const COMFYUI_URL = 'http://localhost:8188';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface LoraConfig {
    name: string;
    strength_model: number;
    strength_clip: number;
}

interface GenerationParameters {
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
    sampler_name?: string;
    scheduler?: string;
    batch_size?: number;
    checkpoint_name?: string;
    loras?: LoraConfig[];
    [key: string]: any;
}

interface WorkflowParameter {
    nodeId: string;
    field: string;
    label: string;
    type: 'string' | 'number' | 'seed' | 'select';
    value: any;
    options?: (string | number)[];
    min?: number;
    max?: number;
}

// Default parameter values
const DEFAULT_PARAMETERS: GenerationParameters = {
    width: 512,
    height: 512,
    steps: 20,
    cfg_scale: 7.0,
    seed: -1,
    sampler_name: 'euler',
    scheduler: 'normal',
    batch_size: 1,
};

// Available samplers
const SAMPLERS = [
    'euler', 'euler_ancestral', 'heun', 'heunpp2',
    'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast',
    'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde',
    'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde',
    'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu',
    'ddpm', 'lcm', 'ddim', 'uni_pc', 'uni_pc_bh2'
];

// Available schedulers
const SCHEDULERS = [
    'normal', 'karras', 'exponential', 'sgm_uniform',
    'simple', 'ddim_uniform', 'beta'
];

// Common dimensions
const DIMENSIONS = [512, 768, 1024, 1280, 1536, 2048];

// SDXL optimal dimensions
const SDXL_DIMENSIONS = [
    { width: 1024, height: 1024, label: '1:1 Square' },
    { width: 1152, height: 896, label: '9:7 Landscape' },
    { width: 896, height: 1152, label: '7:9 Portrait' },
    { width: 1216, height: 832, label: '3:2 Landscape' },
    { width: 832, height: 1216, label: '2:3 Portrait' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

// Apply parameters to a workflow JSON
function applyParametersToWorkflow(
    workflowJson: object,
    params: GenerationParameters,
    prompt: string,
    negativePrompt?: string
): { workflow: object; resolvedSeed: number } {
    const workflow = JSON.parse(JSON.stringify(workflowJson)); // Deep clone
    let resolvedSeed = params.seed ?? -1;

    // If seed is -1, generate a random one
    if (resolvedSeed === -1) {
        resolvedSeed = Math.floor(Math.random() * 2147483647);
    }

    // Find and update nodes by class_type
    for (const [nodeId, node] of Object.entries(workflow)) {
        const classType = (node as any).class_type;
        const inputs = (node as any).inputs;

        if (!inputs) continue;

        switch (classType) {
            case 'CLIPTextEncode':
                // Don't modify here - we'll handle prompts separately below
                break;

            case 'KSampler':
            case 'KSamplerAdvanced':
                inputs.seed = resolvedSeed;
                if (params.steps !== undefined) inputs.steps = params.steps;
                if (params.cfg_scale !== undefined) inputs.cfg = params.cfg_scale;
                if (params.sampler_name !== undefined) inputs.sampler_name = params.sampler_name;
                if (params.scheduler !== undefined) inputs.scheduler = params.scheduler;
                break;

            case 'EmptyLatentImage':
                if (params.width !== undefined) inputs.width = params.width;
                if (params.height !== undefined) inputs.height = params.height;
                if (params.batch_size !== undefined) inputs.batch_size = params.batch_size;
                break;

            case 'CheckpointLoaderSimple':
                // Only override if a specific checkpoint is provided (not empty string)
                if (params.checkpoint_name) inputs.ckpt_name = params.checkpoint_name;
                break;
        }
    }

    // Now handle prompts by finding KSampler and tracing its positive/negative connections
    for (const [nodeId, node] of Object.entries(workflow)) {
        const classType = (node as any).class_type;
        const inputs = (node as any).inputs;

        if (classType === 'KSampler' || classType === 'KSamplerAdvanced') {
            // Get the positive and negative node references
            // Format: ["nodeId", outputIndex]
            const positiveRef = inputs.positive;
            const negativeRef = inputs.negative;

            if (positiveRef && Array.isArray(positiveRef)) {
                const positiveNodeId = positiveRef[0];
                const positiveNode = (workflow as any)[positiveNodeId];
                if (positiveNode?.inputs) {
                    positiveNode.inputs.text = prompt;
                }
            }

            if (negativeRef && Array.isArray(negativeRef)) {
                const negativeNodeId = negativeRef[0];
                const negativeNode = (workflow as any)[negativeNodeId];
                if (negativeNode?.inputs) {
                    negativeNode.inputs.text = negativePrompt || 'low quality, blurry, distorted';
                }
            }
            break; // Only need to process one KSampler
        }
    }

    return { workflow, resolvedSeed };
}

// Extract editable parameters from a workflow
function extractParametersFromWorkflow(workflowJson: object): WorkflowParameter[] {
    const parameters: WorkflowParameter[] = [];

    for (const [nodeId, node] of Object.entries(workflowJson)) {
        const classType = (node as any).class_type;
        const inputs = (node as any).inputs;

        if (!inputs) continue;

        switch (classType) {
            case 'KSampler':
            case 'KSamplerAdvanced':
                parameters.push(
                    { nodeId, field: 'seed', label: 'Seed', type: 'seed', value: inputs.seed || 0, min: 0, max: 2147483647 },
                    { nodeId, field: 'steps', label: 'Steps', type: 'number', value: inputs.steps || 20, min: 1, max: 150 },
                    { nodeId, field: 'cfg', label: 'CFG Scale', type: 'number', value: inputs.cfg || 7, min: 1, max: 30 },
                    { nodeId, field: 'sampler_name', label: 'Sampler', type: 'select', value: inputs.sampler_name || 'euler', options: SAMPLERS },
                    { nodeId, field: 'scheduler', label: 'Scheduler', type: 'select', value: inputs.scheduler || 'normal', options: SCHEDULERS }
                );
                break;

            case 'EmptyLatentImage':
                parameters.push(
                    { nodeId, field: 'width', label: 'Width', type: 'select', value: inputs.width || 512, options: DIMENSIONS },
                    { nodeId, field: 'height', label: 'Height', type: 'select', value: inputs.height || 512, options: DIMENSIONS },
                    { nodeId, field: 'batch_size', label: 'Batch Size', type: 'number', value: inputs.batch_size || 1, min: 1, max: 8 }
                );
                break;
        }
    }

    return parameters;
}


// List workflows
export async function listWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const workflows = await db('comfyui_workflows')
            .leftJoin('profiles', 'comfyui_workflows.profile_id', 'profiles.id')
            .select(
                'comfyui_workflows.*',
                'profiles.name as profile_name'
            )
            .orderBy('comfyui_workflows.name', 'asc');

        res.json({ success: true, data: workflows });
    } catch (error) {
        next(error);
    }
}

// Get single workflow
export async function getWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const workflow = await db('comfyui_workflows').where('id', id).first();
        if (!workflow) {
            throw new NotFoundError(`Workflow ${id} not found`);
        }

        res.json({ success: true, data: workflow });
    } catch (error) {
        next(error);
    }
}

// Create workflow
export async function createWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, description, profileId, workflowJson } = req.body;

        if (!name || !workflowJson) {
            throw new BadRequestError('name and workflowJson are required');
        }

        // Validate JSON
        try {
            JSON.parse(workflowJson);
        } catch {
            throw new BadRequestError('Invalid workflow JSON');
        }

        const db = getDb();
        const [workflow] = await db('comfyui_workflows').insert({
            name,
            description: description || null,
            profile_id: profileId || null,
            workflow_json: workflowJson,
        }).returning('*');

        res.status(201).json({ success: true, data: workflow });
    } catch (error) {
        next(error);
    }
}

// Update workflow
export async function updateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { name, description, profileId, workflowJson } = req.body;
        const db = getDb();

        const updates: any = { updated_at: new Date() };
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (profileId !== undefined) updates.profile_id = profileId;
        if (workflowJson) {
            try {
                JSON.parse(workflowJson);
                updates.workflow_json = workflowJson;
            } catch {
                throw new BadRequestError('Invalid workflow JSON');
            }
        }

        const [workflow] = await db('comfyui_workflows')
            .where('id', id)
            .update(updates)
            .returning('*');

        if (!workflow) {
            throw new NotFoundError(`Workflow ${id} not found`);
        }

        res.json({ success: true, data: workflow });
    } catch (error) {
        next(error);
    }
}

// Delete workflow
export async function deleteWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const deleted = await db('comfyui_workflows').where('id', id).delete();
        if (deleted === 0) {
            throw new NotFoundError(`Workflow ${id} not found`);
        }

        res.json({ success: true, message: `Workflow ${id} deleted` });
    } catch (error) {
        next(error);
    }
}

// Execute workflow
export async function executeWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const workflow = await db('comfyui_workflows').where('id', id).first();
        if (!workflow) {
            throw new NotFoundError(`Workflow ${id} not found`);
        }

        // Parse workflow JSON
        const prompt = JSON.parse(workflow.workflow_json);

        // Send to ComfyUI
        const response = await fetch(`${COMFYUI_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new BadRequestError(`ComfyUI error: ${error}`);
        }

        const result = await response.json() as { prompt_id: string };

        // Create generation record
        const [generation] = await db('comfyui_generations').insert({
            workflow_id: id,
            prompt_id: result.prompt_id,
            status: 'running',
        }).returning('*');

        res.json({ success: true, data: generation });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new BadRequestError('Cannot connect to ComfyUI. Is it running?'));
        } else {
            next(error);
        }
    }
}

// Get generation status
export async function getGeneration(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const generation = await db('comfyui_generations').where('id', id).first();
        if (!generation) {
            throw new NotFoundError(`Generation ${id} not found`);
        }

        // If still running, check ComfyUI status
        if (generation.status === 'running' && generation.prompt_id) {
            try {
                const historyRes = await fetch(`${COMFYUI_URL}/history/${generation.prompt_id}`);
                if (historyRes.ok) {
                    const history = await historyRes.json() as Record<string, any>;
                    const promptHistory = history[generation.prompt_id];

                    if (promptHistory) {
                        // Execution complete - extract outputs
                        const outputs: Array<{ filename: string; subfolder: string; type: string }> = [];

                        for (const nodeId of Object.keys(promptHistory.outputs || {})) {
                            const nodeOutput = promptHistory.outputs[nodeId];
                            if (nodeOutput.images) {
                                outputs.push(...nodeOutput.images);
                            }
                        }

                        await db('comfyui_generations')
                            .where('id', id)
                            .update({
                                status: 'completed',
                                outputs: JSON.stringify(outputs),
                                completed_at: new Date(),
                            });

                        generation.status = 'completed';
                        generation.outputs = JSON.stringify(outputs);
                    }
                }
            } catch {
                // ComfyUI not available, keep current status
            }
        }

        // Parse outputs if present
        const data = {
            ...generation,
            outputs: generation.outputs ? JSON.parse(generation.outputs) : [],
        };

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

// Proxy image from ComfyUI
export async function proxyImage(req: Request, res: Response, next: NextFunction) {
    try {
        const { filename } = req.params;
        const { subfolder = '', type = 'output' } = req.query;

        const imageUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder as string)}&type=${type}`;

        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
            throw new NotFoundError(`Image ${filename} not found`);
        }

        // Forward content type and body
        res.set('Content-Type', imageRes.headers.get('Content-Type') || 'image/png');
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        res.send(buffer);
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new BadRequestError('Cannot connect to ComfyUI'));
        } else {
            next(error);
        }
    }
}

// List generations for a workflow
export async function listGenerations(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const generations = await db('comfyui_generations')
            .where('workflow_id', id)
            .orderBy('created_at', 'desc')
            .limit(20);

        res.json({
            success: true,
            data: generations.map(g => ({
                ...g,
                outputs: g.outputs ? JSON.parse(g.outputs) : [],
            })),
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// SESSION ENDPOINTS
// ============================================

// List all sessions
export async function listSessions(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const sessions = await db('comfyui_sessions')
            .leftJoin('profiles', 'comfyui_sessions.profile_id', 'profiles.id')
            .select(
                'comfyui_sessions.*',
                'profiles.name as profile_name',
                'profiles.url as profile_url'
            )
            .orderBy('comfyui_sessions.updated_at', 'desc');

        res.json({ success: true, data: sessions });
    } catch (error) {
        next(error);
    }
}

// Get single session with its generations
export async function getSession(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const session = await db('comfyui_sessions')
            .leftJoin('profiles', 'comfyui_sessions.profile_id', 'profiles.id')
            .select(
                'comfyui_sessions.*',
                'profiles.name as profile_name',
                'profiles.url as profile_url'
            )
            .where('comfyui_sessions.id', id)
            .first();

        if (!session) {
            throw new NotFoundError(`Session ${id} not found`);
        }

        // Get generations for this session
        const generations = await db('comfyui_generations')
            .where('session_id', id)
            .orderBy('created_at', 'desc');

        res.json({
            success: true,
            data: {
                ...session,
                generations: generations.map(g => ({
                    ...g,
                    outputs: g.outputs ? JSON.parse(g.outputs) : [],
                })),
            },
        });
    } catch (error) {
        next(error);
    }
}

// Create a new session
export async function createSession(req: Request, res: Response, next: NextFunction) {
    try {
        const { profileId, title } = req.body;
        const db = getDb();

        if (!profileId) {
            throw new BadRequestError('profileId is required');
        }

        // Verify profile exists and is ComfyUI
        const profile = await db('profiles').where('id', profileId).first();
        if (!profile) {
            throw new NotFoundError(`Profile ${profileId} not found`);
        }
        if (profile.provider !== 'comfyui') {
            throw new BadRequestError('Profile must be a ComfyUI provider');
        }

        const autoTitle = title || `Session ${new Date().toLocaleString()}`;

        const [session] = await db('comfyui_sessions').insert({
            profile_id: profileId,
            title: autoTitle,
        }).returning('*');

        res.status(201).json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
}

// Update session title
export async function updateSession(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const db = getDb();

        const [session] = await db('comfyui_sessions')
            .where('id', id)
            .update({ title, updated_at: new Date() })
            .returning('*');

        if (!session) {
            throw new NotFoundError(`Session ${id} not found`);
        }

        res.json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
}

// Delete session
export async function deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const deleted = await db('comfyui_sessions').where('id', id).delete();
        if (deleted === 0) {
            throw new NotFoundError(`Session ${id} not found`);
        }

        res.json({ success: true, message: `Session ${id} deleted` });
    } catch (error) {
        next(error);
    }
}

// ============================================
// DIRECT PROMPT SUBMISSION
// ============================================

// Basic txt2img workflow template for SD 1.5
function buildTxt2ImgWorkflow(prompt: string, negativePrompt: string = ''): object {
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": 7,
                "denoise": 1,
                "latent_image": ["5", 0],
                "model": ["4", 0],
                "negative": ["7", 0],
                "positive": ["6", 0],
                "sampler_name": "euler",
                "scheduler": "normal",
                "seed": Math.floor(Math.random() * 1000000000000),
                "steps": 20
            }
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"
            }
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "batch_size": 1,
                "height": 512,
                "width": 512
            }
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["4", 1],
                "text": prompt
            }
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["4", 1],
                "text": negativePrompt || "low quality, blurry, distorted"
            }
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            }
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "ComfyUI",
                "images": ["8", 0]
            }
        }
    };
}

// Submit a prompt directly (creates generation without workflow)
export async function submitPrompt(req: Request, res: Response, next: NextFunction) {
    try {
        const { sessionId, prompt, negativePrompt } = req.body;
        const db = getDb();

        if (!sessionId || !prompt) {
            throw new BadRequestError('sessionId and prompt are required');
        }

        // Get session and profile
        const session = await db('comfyui_sessions')
            .leftJoin('profiles', 'comfyui_sessions.profile_id', 'profiles.id')
            .select('comfyui_sessions.*', 'profiles.url as profile_url')
            .where('comfyui_sessions.id', sessionId)
            .first();

        if (!session) {
            throw new NotFoundError(`Session ${sessionId} not found`);
        }

        const comfyUrl = session.profile_url || COMFYUI_URL;

        // Build the workflow
        const workflow = buildTxt2ImgWorkflow(prompt, negativePrompt);

        // Send to ComfyUI
        const response = await fetch(`${comfyUrl}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: workflow }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new BadRequestError(`ComfyUI error: ${error}`);
        }

        const result = await response.json() as { prompt_id: string };

        // Create generation record
        const [generation] = await db('comfyui_generations').insert({
            session_id: sessionId,
            prompt_id: result.prompt_id,
            prompt_text: prompt,
            status: 'running',
        }).returning('*');

        // Update session timestamp
        await db('comfyui_sessions')
            .where('id', sessionId)
            .update({ updated_at: new Date() });

        res.json({ success: true, data: generation });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new BadRequestError('Cannot connect to ComfyUI. Is it running?'));
        } else {
            next(error);
        }
    }
}

// ============================================
// NEW ENHANCED ENDPOINTS
// ============================================

// Get available options (samplers, schedulers, etc.)
export async function getOptions(req: Request, res: Response, next: NextFunction) {
    try {
        // Try to get checkpoints from ComfyUI
        let checkpoints: string[] = [];
        let loras: string[] = [];

        try {
            const objectInfoRes = await fetch(`${COMFYUI_URL}/object_info`);
            if (objectInfoRes.ok) {
                const objectInfo = await objectInfoRes.json() as Record<string, any>;

                // Get checkpoints from CheckpointLoaderSimple
                if (objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0]) {
                    checkpoints = objectInfo.CheckpointLoaderSimple.input.required.ckpt_name[0];
                }

                // Get LoRAs from LoraLoader
                if (objectInfo.LoraLoader?.input?.required?.lora_name?.[0]) {
                    loras = objectInfo.LoraLoader.input.required.lora_name[0];
                }
            }
        } catch {
            // ComfyUI not available, return empty arrays
        }

        res.json({
            success: true,
            data: {
                samplers: SAMPLERS,
                schedulers: SCHEDULERS,
                checkpoints,
                loras,
                dimensions: {
                    common: DIMENSIONS,
                    sdxl_optimal: SDXL_DIMENSIONS,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

// Enhanced generate with full parameters
export async function generateWithParameters(req: Request, res: Response, next: NextFunction) {
    try {
        const { sessionId } = req.params;
        const {
            workflow_id,
            prompt_text,
            negative_prompt,
            parameters = {}
        } = req.body;

        const db = getDb();

        if (!prompt_text) {
            throw new BadRequestError('prompt_text is required');
        }

        // Get session
        const session = await db('comfyui_sessions')
            .leftJoin('profiles', 'comfyui_sessions.profile_id', 'profiles.id')
            .select('comfyui_sessions.*', 'profiles.url as profile_url')
            .where('comfyui_sessions.id', sessionId)
            .first();

        if (!session) {
            throw new NotFoundError(`Session ${sessionId} not found`);
        }

        const comfyUrl = session.profile_url || COMFYUI_URL;

        // Get workflow if specified, otherwise use default txt2img
        let workflowJson: object;
        let workflowId: string | null = workflow_id || session.current_workflow_id;

        if (workflowId) {
            const workflow = await db('comfyui_workflows').where('id', workflowId).first();
            if (!workflow) {
                throw new NotFoundError(`Workflow ${workflowId} not found`);
            }
            workflowJson = JSON.parse(workflow.workflow_json);
        } else {
            // Use built-in txt2img workflow
            workflowJson = buildTxt2ImgWorkflow(prompt_text, negative_prompt);
        }

        // Merge default parameters with provided ones
        const mergedParams: GenerationParameters = {
            ...DEFAULT_PARAMETERS,
            ...session.last_parameters,
            ...parameters,
        };

        // Apply parameters to workflow
        const { workflow: modifiedWorkflow, resolvedSeed } = applyParametersToWorkflow(
            workflowJson,
            mergedParams,
            prompt_text,
            negative_prompt
        );

        // Store the resolved seed
        mergedParams.seed = resolvedSeed;

        const startTime = Date.now();

        // Send to ComfyUI
        const response = await fetch(`${comfyUrl}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: modifiedWorkflow }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new BadRequestError(`ComfyUI error: ${error}`);
        }

        const result = await response.json() as { prompt_id: string };

        // Create generation record with all details
        const [generation] = await db('comfyui_generations').insert({
            session_id: sessionId,
            workflow_id: workflowId,
            workflow_json_snapshot: JSON.stringify(modifiedWorkflow),
            prompt_id: result.prompt_id,
            prompt_text,
            negative_prompt,
            parameters: JSON.stringify(mergedParams),
            width: mergedParams.width,
            height: mergedParams.height,
            steps: mergedParams.steps,
            cfg_scale: mergedParams.cfg_scale,
            seed: resolvedSeed,
            sampler_name: mergedParams.sampler_name,
            scheduler: mergedParams.scheduler,
            batch_size: mergedParams.batch_size || 1,
            checkpoint_name: mergedParams.checkpoint_name,
            loras_used: JSON.stringify(mergedParams.loras || []),
            status: 'running',
            batch_index: 0,
        }).returning('*');

        // Update session with last used parameters and increment count
        await db('comfyui_sessions')
            .where('id', sessionId)
            .update({
                updated_at: new Date(),
                last_parameters: JSON.stringify(mergedParams),
                generation_count: db.raw('generation_count + 1'),
            });

        // Parse outputs and parameters for response
        const responseData = {
            ...generation,
            parameters: typeof generation.parameters === 'string'
                ? JSON.parse(generation.parameters)
                : generation.parameters,
            loras_used: typeof generation.loras_used === 'string'
                ? JSON.parse(generation.loras_used)
                : generation.loras_used,
            outputs: [],
        };

        res.json({ success: true, data: responseData });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new BadRequestError('Cannot connect to ComfyUI. Is it running?'));
        } else {
            next(error);
        }
    }
}

// Get generation workflow for reproduction
export async function getGenerationWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const generation = await db('comfyui_generations').where('id', id).first();
        if (!generation) {
            throw new NotFoundError(`Generation ${id} not found`);
        }

        res.json({
            success: true,
            data: {
                workflow_json: generation.workflow_json_snapshot
                    ? JSON.parse(generation.workflow_json_snapshot)
                    : null,
                parameters: generation.parameters
                    ? (typeof generation.parameters === 'string'
                        ? JSON.parse(generation.parameters)
                        : generation.parameters)
                    : {},
                prompt_text: generation.prompt_text,
                negative_prompt: generation.negative_prompt,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Update workflow with default parameters and extracted parameters
export async function updateWorkflowParameters(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { default_parameters, is_default } = req.body;
        const db = getDb();

        const workflow = await db('comfyui_workflows').where('id', id).first();
        if (!workflow) {
            throw new NotFoundError(`Workflow ${id} not found`);
        }

        const updates: any = { updated_at: new Date() };

        if (default_parameters !== undefined) {
            updates.default_parameters = JSON.stringify(default_parameters);
        }

        if (is_default !== undefined) {
            // If setting as default, unset other defaults for same profile
            if (is_default && workflow.profile_id) {
                await db('comfyui_workflows')
                    .where('profile_id', workflow.profile_id)
                    .update({ is_default: false });
            }
            updates.is_default = is_default;
        }

        // Extract and cache parameters from workflow
        const workflowJson = JSON.parse(workflow.workflow_json);
        updates.extracted_parameters = JSON.stringify(extractParametersFromWorkflow(workflowJson));

        const [updated] = await db('comfyui_workflows')
            .where('id', id)
            .update(updates)
            .returning('*');

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
}

