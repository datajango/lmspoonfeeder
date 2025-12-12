import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db';
import { decrypt } from '../utils/encryption';
import { GenerateOptions, GenerateResult } from '../types';

async function getClient(): Promise<Anthropic> {
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'claude').first();

    if (!settings) {
        throw new Error('Claude not configured. Please add API key in settings.');
    }

    const apiKey = decrypt(settings.api_key);
    return new Anthropic({ apiKey });
}

export async function testConnection(): Promise<boolean> {
    const client = await getClient();
    await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
    });
    return true;
}

export async function generate(
    prompt: string,
    options?: GenerateOptions & { model?: string }
): Promise<GenerateResult> {
    const client = await getClient();
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'claude').first();

    const model = options?.model || settings?.default_model || 'claude-3-sonnet-20240229';

    const response = await client.messages.create({
        model,
        max_tokens: options?.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature,
        top_p: options?.topP,
        top_k: options?.topK,
        stop_sequences: options?.stop,
    });

    const content = response.content[0];

    return {
        content: content.type === 'text' ? content.text : '',
        model: response.model,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        finishReason: response.stop_reason || 'unknown',
    };
}
