import { config } from '../config';
import { GenerateOptions, GenerateResult, ModelInfo } from '../types';

const OLLAMA_API = config.ollama.url;

export async function listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${OLLAMA_API}/api/tags`);

    if (!response.ok) {
        throw new Error('Failed to fetch models from Ollama');
    }

    const data = await response.json() as { models: any[] };
    return data.models.map((m: any) => ({
        name: m.name,
        size: formatBytes(m.size),
        loaded: false,
        capabilities: ['chat'],
        description: m.details?.family || 'Unknown',
        parameters: m.details?.parameter_size || 'Unknown',
    }));
}

export async function generate(
    model: string,
    prompt: string,
    options?: GenerateOptions
): Promise<GenerateResult> {
    const response = await fetch(`${OLLAMA_API}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
                temperature: options?.temperature,
                num_predict: options?.maxTokens,
                top_p: options?.topP,
                top_k: options?.topK,
                stop: options?.stop,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama generation failed: ${response.statusText}`);
    }

    const data = await response.json() as Record<string, any>;

    return {
        content: data.response,
        model: data.model,
        tokensUsed: data.eval_count,
        finishReason: data.done ? 'stop' : 'length',
    };
}

export async function chat(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options?: GenerateOptions
): Promise<GenerateResult> {
    const response = await fetch(`${OLLAMA_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            stream: false,
            options: {
                temperature: options?.temperature,
                num_predict: options?.maxTokens,
                top_p: options?.topP,
                top_k: options?.topK,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama chat failed: ${response.statusText}`);
    }

    const data = await response.json() as Record<string, any>;

    return {
        content: data.message?.content || '',
        model: data.model,
        tokensUsed: data.eval_count,
        finishReason: data.done ? 'stop' : 'length',
    };
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
