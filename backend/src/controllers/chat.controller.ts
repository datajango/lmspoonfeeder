import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { decrypt } from '../utils/encryption';
import { BadRequestError } from '../middleware/error.middleware';
import { config } from '../config';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequest {
    provider: 'ollama' | 'openai' | 'gemini' | 'claude';
    model: string;
    messages: ChatMessage[];
}

// List all available chat sources
export async function listChatSources(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const sources: Array<{ id: string; name: string; provider: string; type: 'local' | 'remote' }> = [];

        // Get Ollama models
        try {
            const ollamaRes = await fetch(`${config.ollama.url}/api/tags`);
            if (ollamaRes.ok) {
                const data = await ollamaRes.json() as { models: any[] };
                data.models.forEach((m: any) => {
                    sources.push({
                        id: `ollama:${m.name}`,
                        name: m.name,
                        provider: 'ollama',
                        type: 'local',
                    });
                });
            }
        } catch {
            // Ollama not running
        }

        // Get configured remote providers
        const providers = await db('provider_settings')
            .whereIn('status', ['connected', 'unknown'])
            .select('provider', 'default_model');

        for (const p of providers) {
            const modelName = p.default_model || getDefaultModel(p.provider);
            sources.push({
                id: `${p.provider}:${modelName}`,
                name: `${p.provider.charAt(0).toUpperCase() + p.provider.slice(1)} (${modelName})`,
                provider: p.provider,
                type: 'remote',
            });
        }

        res.json({ success: true, data: sources });
    } catch (error) {
        next(error);
    }
}

// Chat endpoint
export async function chat(req: Request, res: Response, next: NextFunction) {
    try {
        const { provider, model, messages }: ChatRequest = req.body;

        if (!provider || !model || !messages || messages.length === 0) {
            throw new BadRequestError('provider, model, and messages are required');
        }

        let response: string;

        switch (provider) {
            case 'ollama':
                response = await chatOllama(model, messages);
                break;
            case 'openai':
                response = await chatOpenAI(model, messages);
                break;
            case 'gemini':
                response = await chatGemini(model, messages);
                break;
            case 'claude':
                response = await chatClaude(model, messages);
                break;
            default:
                throw new BadRequestError(`Unknown provider: ${provider}`);
        }

        res.json({
            success: true,
            data: {
                role: 'assistant',
                content: response,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Provider-specific chat functions
async function chatOllama(model: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${config.ollama.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false }),
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json() as { message?: { content: string } };
    return data.message?.content || '';
}

async function chatOpenAI(model: string, messages: ChatMessage[]): Promise<string> {
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'openai').first();
    if (!settings) throw new Error('OpenAI not configured');

    const apiKey = decrypt(settings.api_key);
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL: settings.endpoint_url || undefined });

    const response = await client.chat.completions.create({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return response.choices[0]?.message?.content || '';
}

async function chatGemini(model: string, messages: ChatMessage[]): Promise<string> {
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'gemini').first();
    if (!settings) throw new Error('Gemini not configured');

    const apiKey = decrypt(settings.api_key);
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));

    const chat = geminiModel.startChat({ history: history as any });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);

    return result.response.text();
}

async function chatClaude(model: string, messages: ChatMessage[]): Promise<string> {
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'claude').first();
    if (!settings) throw new Error('Claude not configured');

    const apiKey = decrypt(settings.api_key);
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    // Extract system message if present
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemMsg?.content,
        messages: chatMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
}

function getDefaultModel(provider: string): string {
    switch (provider) {
        case 'openai': return 'gpt-4o-mini';
        case 'gemini': return 'gemini-pro';
        case 'claude': return 'claude-3-haiku-20240307';
        default: return 'unknown';
    }
}
