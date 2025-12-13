import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';

const COMFYUI_URL = 'http://localhost:8188';

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
