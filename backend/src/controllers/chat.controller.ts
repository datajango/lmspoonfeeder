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
    provider: 'ollama' | 'openai' | 'gemini' | 'claude' | 'comfyui';
    model: string;
    messages: ChatMessage[];
    profileId?: string; // Optional profile ID for API key lookup
}

// List all available chat sources (from profiles only)
export async function listChatSources(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const sources: Array<{ id: string; name: string; provider: string; type: 'local' | 'remote' }> = [];

        // Get all profiles (they represent chat sources)
        const profiles = await db('profiles').select('*');

        for (const profile of profiles) {
            // Determine if local or remote based on provider
            const isLocal = profile.provider === 'ollama';

            sources.push({
                id: `profile:${profile.id}`,
                name: profile.name,
                provider: profile.provider,
                type: isLocal ? 'local' : 'remote',
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
        const { provider, model, messages, profileId }: ChatRequest = req.body;

        if (!provider || !model || !messages || messages.length === 0) {
            throw new BadRequestError('provider, model, and messages are required');
        }

        let response: string;

        switch (provider) {
            case 'ollama':
                response = await chatOllama(model, messages);
                break;
            case 'openai':
                response = await chatOpenAI(model, messages, profileId);
                break;
            case 'gemini':
                response = await chatGemini(model, messages, profileId);
                break;
            case 'claude':
                response = await chatClaude(model, messages, profileId);
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

async function getProfileApiKey(profileId: string | undefined, provider: string): Promise<{ apiKey: string; url?: string }> {
    const db = getDb();

    if (profileId) {
        // Use specific profile
        const profile = await db('profiles').where('id', profileId).first();
        if (!profile || !profile.api_key) {
            throw new Error(`Profile ${profileId} not found or has no API key`);
        }
        return { apiKey: decrypt(profile.api_key), url: profile.url };
    }

    // Fall back to first profile with API key for this provider
    const profile = await db('profiles')
        .where('provider', provider)
        .whereNotNull('api_key')
        .first();

    if (!profile) {
        throw new Error(`No ${provider} profile with API key configured. Create a profile with an API key first.`);
    }

    return { apiKey: decrypt(profile.api_key), url: profile.url };
}

async function chatOpenAI(model: string, messages: ChatMessage[], profileId?: string): Promise<string> {
    const { apiKey, url } = await getProfileApiKey(profileId, 'openai');

    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL: url || undefined });

    const response = await client.chat.completions.create({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return response.choices[0]?.message?.content || '';
}

async function chatGemini(model: string, messages: ChatMessage[], profileId?: string): Promise<string> {
    const { apiKey } = await getProfileApiKey(profileId, 'gemini');

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

async function chatClaude(model: string, messages: ChatMessage[], profileId?: string): Promise<string> {
    const { apiKey } = await getProfileApiKey(profileId, 'claude');

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

