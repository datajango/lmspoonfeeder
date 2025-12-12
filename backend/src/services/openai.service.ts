import OpenAI from 'openai';
import { getDb } from '../db';
import { decrypt } from '../utils/encryption';
import { GenerateOptions, GenerateResult } from '../types';

async function getClient(): Promise<OpenAI> {
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'openai').first();

    if (!settings) {
        throw new Error('OpenAI not configured. Please add API key in settings.');
    }

    const apiKey = decrypt(settings.api_key);

    return new OpenAI({
        apiKey,
        baseURL: settings.endpoint_url || undefined,
    });
}

export async function testConnection(): Promise<boolean> {
    const client = await getClient();
    await client.models.list();
    return true;
}

export async function generate(
    prompt: string,
    options?: GenerateOptions & { model?: string }
): Promise<GenerateResult> {
    const client = await getClient();
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'openai').first();

    const model = options?.model || settings?.default_model || 'gpt-3.5-turbo';

    const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        stop: options?.stop,
    });

    return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        tokensUsed: response.usage?.total_tokens,
        finishReason: response.choices[0]?.finish_reason || 'unknown',
    };
}

export async function generateImage(
    prompt: string,
    options?: { size?: '256x256' | '512x512' | '1024x1024'; n?: number }
): Promise<string[]> {
    const client = await getClient();

    const response = await client.images.generate({
        model: 'dall-e-3',
        prompt,
        n: options?.n || 1,
        size: options?.size || '1024x1024',
    });

    return response.data?.map((img) => img.url || '').filter(Boolean) || [];
}
