import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { NotFoundError, ProviderConnectionError } from '../middleware/error.middleware';
import { ModelInfo } from '../types';

const OLLAMA_API = config.ollama.url;

export async function listModels(req: Request, res: Response, next: NextFunction) {
    try {
        const response = await fetch(`${OLLAMA_API}/api/tags`);

        if (!response.ok) {
            throw new ProviderConnectionError('Ollama', 'Failed to fetch models');
        }

        const data = await response.json() as { models: any[] };
        const models: ModelInfo[] = data.models.map((m: any) => ({
            name: m.name,
            size: formatBytes(m.size),
            loaded: false, // Will be updated by checking running models
            capabilities: inferCapabilities(m.name),
            description: m.details?.family || 'Unknown',
            parameters: m.details?.parameter_size || 'Unknown',
        }));

        res.json({ success: true, data: models });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new ProviderConnectionError('Ollama', 'Ollama is not running'));
        } else {
            next(error);
        }
    }
}

export async function getModelInfo(req: Request, res: Response, next: NextFunction) {
    try {
        const { name } = req.params;

        const response = await fetch(`${OLLAMA_API}/api/show`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new NotFoundError(`Model ${name} not found`);
            }
            throw new ProviderConnectionError('Ollama', 'Failed to get model info');
        }

        const data = await response.json() as Record<string, any>;

        res.json({
            success: true,
            data: {
                name,
                size: formatBytes(data.size || 0),
                loaded: false,
                capabilities: inferCapabilities(name),
                description: data.modelfile || '',
                parameters: data.parameters || '',
                template: data.template || '',
            },
        });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new ProviderConnectionError('Ollama', 'Ollama is not running'));
        } else {
            next(error);
        }
    }
}

export async function loadModel(req: Request, res: Response, next: NextFunction) {
    try {
        const { name } = req.params;

        // Pull/load the model
        const response = await fetch(`${OLLAMA_API}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            throw new ProviderConnectionError('Ollama', 'Failed to load model');
        }

        res.json({ success: true, message: `Model ${name} is loading` });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new ProviderConnectionError('Ollama', 'Ollama is not running'));
        } else {
            next(error);
        }
    }
}

export async function unloadModel(req: Request, res: Response, next: NextFunction) {
    try {
        const { name } = req.params;

        // Ollama doesn't have a direct unload API, but we can generate with keep_alive: 0
        const response = await fetch(`${OLLAMA_API}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: name, prompt: '', keep_alive: 0 }),
        });

        if (!response.ok) {
            throw new ProviderConnectionError('Ollama', 'Failed to unload model');
        }

        res.json({ success: true, message: `Model ${name} unloaded` });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new ProviderConnectionError('Ollama', 'Ollama is not running'));
        } else {
            next(error);
        }
    }
}

export async function getModelStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const { name } = req.params;

        // Check running models
        const response = await fetch(`${OLLAMA_API}/api/ps`);

        if (!response.ok) {
            throw new ProviderConnectionError('Ollama', 'Failed to get running models');
        }

        const data = await response.json() as { models?: any[] };
        const running = data.models?.find((m: any) => m.name === name || m.model === name);

        res.json({
            success: true,
            data: {
                name,
                loaded: !!running,
                sizeVram: running?.size_vram ? formatBytes(running.size_vram) : null,
            },
        });
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            next(new ProviderConnectionError('Ollama', 'Ollama is not running'));
        } else {
            next(error);
        }
    }
}

// Helper functions
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function inferCapabilities(modelName: string): string[] {
    const name = modelName.toLowerCase();
    const caps: string[] = ['chat'];

    if (name.includes('code') || name.includes('coder') || name.includes('deepseek')) {
        caps.push('code');
    }
    if (name.includes('vision') || name.includes('llava')) {
        caps.push('vision');
    }
    if (name.includes('embed')) {
        caps.push('embeddings');
    }

    return caps;
}
