import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../db';
import { decrypt } from '../utils/encryption';
import { GenerateOptions, GenerateResult } from '../types';

async function getClient(): Promise<GoogleGenerativeAI> {
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'gemini').first();

    if (!settings) {
        throw new Error('Gemini not configured. Please add API key in settings.');
    }

    const apiKey = decrypt(settings.api_key);
    return new GoogleGenerativeAI(apiKey);
}

export async function testConnection(): Promise<boolean> {
    const genAI = await getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    await model.countTokens('test');
    return true;
}

export async function generate(
    prompt: string,
    options?: GenerateOptions & { model?: string }
): Promise<GenerateResult> {
    const genAI = await getClient();
    const db = getDb();
    const settings = await db('provider_settings').where('provider', 'gemini').first();

    const modelName = options?.model || settings?.default_model || 'gemini-pro';
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: options?.temperature,
            maxOutputTokens: options?.maxTokens,
            topP: options?.topP,
            topK: options?.topK,
            stopSequences: options?.stop,
        },
    });

    const response = await result.response;

    return {
        content: response.text(),
        model: modelName,
        tokensUsed: undefined, // Gemini doesn't return token count directly
        finishReason: response.candidates?.[0]?.finishReason || 'unknown',
    };
}
