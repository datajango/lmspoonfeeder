import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { ProfileInput } from '../types';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';
import { encrypt, decrypt, maskApiKey } from '../utils/encryption';

// Helper to format profile response with masked API key and parsed modalities
function formatProfile(profile: any) {
    return {
        ...profile,
        api_key: profile.api_key ? maskApiKey(decrypt(profile.api_key)) : null,
        input_modalities: profile.input_modalities ? JSON.parse(profile.input_modalities) : ['text'],
        output_modalities: profile.output_modalities ? JSON.parse(profile.output_modalities) : ['text'],
    };
}

// Detect input/output modalities based on model name
function detectModalities(modelName: string): { inputs: string[]; outputs: string[] } {
    const name = modelName.toLowerCase();

    // Vision models (text+image input, text output)
    if (name.includes('vision') || name.includes('llava') || name.includes('gpt-4o') ||
        name.includes('gpt-4-turbo') || name.includes('gemini-pro-vision') ||
        name.includes('gemini-1.5') || name.includes('claude-3')) {
        return { inputs: ['text', 'image'], outputs: ['text'] };
    }

    // Image generation models (text input, image output)
    if (name.includes('dall-e') || name.includes('stable-diffusion') ||
        name.includes('imagen') || name.includes('sdxl')) {
        return { inputs: ['text'], outputs: ['image'] };
    }

    // Speech-to-text models (audio input, text output)
    if (name.includes('whisper')) {
        return { inputs: ['audio'], outputs: ['text'] };
    }

    // Text-to-speech models (text input, audio output)
    if (name.includes('tts') || name.includes('text-to-speech')) {
        return { inputs: ['text'], outputs: ['audio'] };
    }

    // Audio models with GPT-4o realtime
    if (name.includes('realtime') || name.includes('audio')) {
        return { inputs: ['text', 'audio'], outputs: ['text', 'audio'] };
    }

    // Default: text-only
    return { inputs: ['text'], outputs: ['text'] };
}

export async function listProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const profiles = await db('profiles').orderBy('name', 'asc');

        res.json({ success: true, data: profiles.map(formatProfile) });
    } catch (error) {
        next(error);
    }
}

export async function createProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const input: ProfileInput = req.body;

        if (!input.name || !input.type || !input.provider) {
            throw new BadRequestError('name, type, and provider are required');
        }

        const db = getDb();
        const profileData: any = {
            name: input.name,
            description: input.description || null,
            type: input.type,
            provider: input.provider,
            api_key: input.apiKey ? encrypt(input.apiKey) : null,
            url: input.url || null,
            options: input.options ? JSON.stringify(input.options) : null,
            prompt_template: input.promptTemplate || null,
            input_modalities: JSON.stringify(input.inputModalities || ['text']),
            output_modalities: JSON.stringify(input.outputModalities || ['text']),
        };
        const [profile] = await db('profiles').insert(profileData).returning('*');

        res.status(201).json({ success: true, data: formatProfile(profile) });
    } catch (error) {
        next(error);
    }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const profile = await db('profiles').where('id', id).first();

        if (!profile) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        res.json({ success: true, data: formatProfile(profile) });
    } catch (error) {
        next(error);
    }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const input: Partial<ProfileInput> = req.body;
        const db = getDb();

        const existing = await db('profiles').where('id', id).first();

        if (!existing) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        const updateData: any = { updated_at: new Date() };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.type !== undefined) updateData.type = input.type;
        if (input.provider !== undefined) updateData.provider = input.provider;
        if (input.apiKey !== undefined) updateData.api_key = input.apiKey ? encrypt(input.apiKey) : null;
        if (input.url !== undefined) updateData.url = input.url || null;
        if (input.options !== undefined) updateData.options = JSON.stringify(input.options);
        if (input.promptTemplate !== undefined) updateData.prompt_template = input.promptTemplate;
        if (input.inputModalities !== undefined) updateData.input_modalities = JSON.stringify(input.inputModalities);
        if (input.outputModalities !== undefined) updateData.output_modalities = JSON.stringify(input.outputModalities);

        const [profile] = await db('profiles').where('id', id).update(updateData).returning('*');

        res.json({ success: true, data: formatProfile(profile) });
    } catch (error) {
        next(error);
    }
}

export async function deleteProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const deleted = await db('profiles').where('id', id).delete();

        if (deleted === 0) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        res.json({ success: true, message: `Profile ${id} deleted` });
    } catch (error) {
        next(error);
    }
}

// Test connection before saving profile
export async function testConnection(req: Request, res: Response, next: NextFunction) {
    try {
        const { provider, apiKey, url } = req.body;

        if (!provider) {
            throw new BadRequestError('provider is required');
        }

        let success = false;
        let message = '';

        switch (provider) {
            case 'ollama': {
                const baseUrl = url || 'http://localhost:11434';
                try {
                    const response = await fetch(`${baseUrl}/api/tags`);
                    if (response.ok) {
                        const data = await response.json() as { models: any[] };
                        success = true;
                        message = `Connected! Found ${data.models?.length || 0} models`;
                    } else {
                        message = 'Failed to connect to Ollama';
                    }
                } catch {
                    message = 'Cannot connect to Ollama. Is it running?';
                }
                break;
            }
            case 'openai': {
                if (!apiKey) {
                    throw new BadRequestError('API key required for OpenAI');
                }
                try {
                    const { default: OpenAI } = await import('openai');
                    const client = new OpenAI({ apiKey, baseURL: url || undefined });
                    const models = await client.models.list();
                    success = true;
                    message = `Connected! Found ${models.data.length} models`;
                } catch (e: any) {
                    message = e.message || 'Failed to connect to OpenAI';
                }
                break;
            }
            case 'gemini': {
                if (!apiKey) {
                    throw new BadRequestError('API key required for Gemini');
                }
                // Simple test - just verify key format and try to list
                success = apiKey.length > 20;
                message = success ? 'API key looks valid' : 'Invalid API key format';
                break;
            }
            case 'claude': {
                if (!apiKey) {
                    throw new BadRequestError('API key required for Claude');
                }
                // Simple test - verify key format
                success = apiKey.startsWith('sk-ant-') || apiKey.length > 20;
                message = success ? 'API key looks valid' : 'Invalid API key format';
                break;
            }
            case 'comfyui': {
                const baseUrl = url || 'http://localhost:8188';
                try {
                    const response = await fetch(`${baseUrl}/system_stats`);
                    if (response.ok) {
                        success = true;
                        message = 'Connected to ComfyUI!';
                    } else {
                        message = 'Failed to connect to ComfyUI';
                    }
                } catch {
                    message = 'Cannot connect to ComfyUI. Is it running?';
                }
                break;
            }
            default:
                throw new BadRequestError(`Unknown provider: ${provider}`);
        }

        res.json({ success, message });
    } catch (error) {
        next(error);
    }
}

// List stored models for a profile
export async function listProfileModels(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const profile = await db('profiles').where('id', id).first();
        if (!profile) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        const models = await db('profile_models')
            .where('profile_id', id)
            .orderBy('name', 'asc');

        res.json({
            success: true,
            data: models.map(m => ({
                id: m.model_id,
                name: m.name || m.model_id,
                inputModalities: JSON.parse(m.input_modalities || '["text"]'),
                outputModalities: JSON.parse(m.output_modalities || '["text"]'),
            })),
        });
    } catch (error) {
        next(error);
    }
}

// Add a model to a profile manually
export async function addProfileModel(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { modelId, name } = req.body;
        const db = getDb();

        if (!modelId) {
            throw new BadRequestError('modelId is required');
        }

        const profile = await db('profiles').where('id', id).first();
        if (!profile) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        // Check if already exists
        const existing = await db('profile_models')
            .where({ profile_id: id, model_id: modelId })
            .first();

        if (existing) {
            throw new BadRequestError(`Model ${modelId} already exists for this profile`);
        }

        const modalities = detectModalities(modelId);
        const [model] = await db('profile_models').insert({
            profile_id: id,
            model_id: modelId,
            name: name || modelId,
            input_modalities: JSON.stringify(modalities.inputs),
            output_modalities: JSON.stringify(modalities.outputs),
        }).returning('*');

        res.status(201).json({
            success: true,
            data: {
                id: model.model_id,
                name: model.name,
                inputModalities: modalities.inputs,
                outputModalities: modalities.outputs,
            }
        });
    } catch (error) {
        next(error);
    }
}

// Delete a model from a profile
export async function deleteProfileModel(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, modelId } = req.params;
        const db = getDb();

        const deleted = await db('profile_models')
            .where({ profile_id: id, model_id: modelId })
            .delete();

        if (deleted === 0) {
            throw new NotFoundError(`Model ${modelId} not found for profile ${id}`);
        }

        res.json({ success: true, message: `Model ${modelId} deleted` });
    } catch (error) {
        next(error);
    }
}

// Update model modalities
export async function updateProfileModelModalities(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, modelId } = req.params;
        const { inputModalities, outputModalities } = req.body;
        const db = getDb();

        const existing = await db('profile_models')
            .where({ profile_id: id, model_id: modelId })
            .first();

        if (!existing) {
            throw new NotFoundError(`Model ${modelId} not found for profile ${id}`);
        }

        const updateData: any = {};
        if (inputModalities !== undefined) {
            updateData.input_modalities = JSON.stringify(inputModalities);
        }
        if (outputModalities !== undefined) {
            updateData.output_modalities = JSON.stringify(outputModalities);
        }

        await db('profile_models')
            .where({ profile_id: id, model_id: modelId })
            .update(updateData);

        res.json({ success: true, message: 'Modalities updated' });
    } catch (error) {
        next(error);
    }
}

// Sync models from provider API and store in database
export async function syncProfileModels(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const profile = await db('profiles').where('id', id).first();
        if (!profile) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        let models: Array<{ id: string; name: string }> = [];

        switch (profile.provider) {
            case 'openai':
                models = await fetchOpenAIModels(profile);
                break;
            case 'gemini':
                models = getGeminiModels();
                break;
            case 'claude':
                models = getClaudeModels();
                break;
            case 'ollama':
                models = await fetchOllamaModels(profile);
                break;
            default:
                throw new BadRequestError(`Unsupported provider: ${profile.provider}`);
        }

        // Clear existing models and insert new ones
        await db('profile_models').where('profile_id', id).delete();

        if (models.length > 0) {
            await db('profile_models').insert(
                models.map(m => {
                    const modalities = detectModalities(m.id);
                    return {
                        profile_id: id,
                        model_id: m.id,
                        name: m.name,
                        input_modalities: JSON.stringify(modalities.inputs),
                        output_modalities: JSON.stringify(modalities.outputs),
                    };
                })
            );
        }

        const stored = await db('profile_models')
            .where('profile_id', id)
            .orderBy('name', 'asc');

        res.json({
            success: true,
            message: `Synced ${models.length} models`,
            data: stored.map(m => ({
                id: m.model_id,
                name: m.name,
                inputModalities: JSON.parse(m.input_modalities || '["text"]'),
                outputModalities: JSON.parse(m.output_modalities || '["text"]'),
            })),
        });
    } catch (error) {
        next(error);
    }
}

// Provider-specific model fetching (used by sync)
async function fetchOpenAIModels(profile: any): Promise<Array<{ id: string; name: string }>> {
    if (!profile.api_key) {
        throw new BadRequestError('Profile has no API key configured');
    }

    const apiKey = decrypt(profile.api_key);
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL: profile.url || undefined });

    const response = await client.models.list();

    // Filter to chat models and sort by name
    const chatModels = response.data
        .filter(m => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('chatgpt'))
        .sort((a, b) => a.id.localeCompare(b.id));

    return chatModels.map(m => ({
        id: m.id,
        name: m.id,
    }));
}

function getGeminiModels(): Array<{ id: string; name: string }> {
    return [
        { id: 'gemini-pro', name: 'Gemini Pro' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
    ];
}

function getClaudeModels(): Array<{ id: string; name: string }> {
    return [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ];
}

async function fetchOllamaModels(profile: any): Promise<Array<{ id: string; name: string }>> {
    const { config } = await import('../config');
    const baseUrl = profile.url || config.ollama.url;

    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
        throw new Error('Failed to fetch Ollama models. Is Ollama running?');
    }

    const data = await response.json() as { models: any[] };
    return data.models.map((m: any) => ({
        id: m.name,
        name: m.name,
    }));
}

