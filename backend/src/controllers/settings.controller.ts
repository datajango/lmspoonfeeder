import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { ProviderSettings, ProviderSettingsInput, ProviderType } from '../types';
import { encrypt, decrypt, maskApiKey } from '../utils/encryption';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';

const VALID_PROVIDERS: ProviderType[] = ['openai', 'gemini', 'claude'];

function validateProvider(provider: string): ProviderType {
    if (!VALID_PROVIDERS.includes(provider as ProviderType)) {
        throw new BadRequestError(`Invalid provider: ${provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }
    return provider as ProviderType;
}

export async function getAllSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const settings = await db('provider_settings').select('*');

        // Mask API keys in response
        const masked = settings.map((s) => ({
            id: s.id,
            provider: s.provider,
            apiKey: maskApiKey(decrypt(s.api_key)),
            endpointUrl: s.endpoint_url,
            defaultModel: s.default_model,
            lastTested: s.last_tested,
            status: s.status,
            errorMessage: s.error_message,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
        }));

        res.json({ success: true, data: masked });
    } catch (error) {
        next(error);
    }
}

export async function getSettingsByProvider(req: Request, res: Response, next: NextFunction) {
    try {
        const provider = validateProvider(req.params.provider);
        const db = getDb();

        const settings = await db('provider_settings').where('provider', provider).first();

        if (!settings) {
            throw new NotFoundError(`Settings for provider ${provider} not found`);
        }

        res.json({
            success: true,
            data: {
                id: settings.id,
                provider: settings.provider,
                apiKey: maskApiKey(decrypt(settings.api_key)),
                endpointUrl: settings.endpoint_url,
                defaultModel: settings.default_model,
                lastTested: settings.last_tested,
                status: settings.status,
                errorMessage: settings.error_message,
                createdAt: settings.created_at,
                updatedAt: settings.updated_at,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const provider = validateProvider(req.params.provider);
        const input: ProviderSettingsInput = req.body;

        if (!input.apiKey) {
            throw new BadRequestError('apiKey is required');
        }

        const db = getDb();
        const encryptedKey = encrypt(input.apiKey);

        // Upsert: insert or update
        const existing = await db('provider_settings').where('provider', provider).first();

        if (existing) {
            await db('provider_settings').where('provider', provider).update({
                api_key: encryptedKey,
                endpoint_url: input.endpointUrl || null,
                default_model: input.defaultModel || null,
                status: 'unknown',
                error_message: null,
                updated_at: new Date(),
            });
        } else {
            await db('provider_settings').insert({
                provider,
                api_key: encryptedKey,
                endpoint_url: input.endpointUrl || null,
                default_model: input.defaultModel || null,
                status: 'unknown',
            });
        }

        res.json({ success: true, message: `Settings for ${provider} updated` });
    } catch (error) {
        next(error);
    }
}

export async function testConnection(req: Request, res: Response, next: NextFunction) {
    try {
        const provider = validateProvider(req.params.provider);
        const db = getDb();

        const settings = await db('provider_settings').where('provider', provider).first();

        if (!settings) {
            throw new NotFoundError(`Settings for provider ${provider} not found. Please configure first.`);
        }

        const apiKey = decrypt(settings.api_key);
        let testResult = { success: false, message: '' };

        // Test connection based on provider
        try {
            switch (provider) {
                case 'openai':
                    testResult = await testOpenAI(apiKey, settings.endpoint_url);
                    break;
                case 'gemini':
                    testResult = await testGemini(apiKey);
                    break;
                case 'claude':
                    testResult = await testClaude(apiKey);
                    break;
            }
        } catch (error: any) {
            testResult = { success: false, message: error.message };
        }

        // Update status in database
        await db('provider_settings').where('provider', provider).update({
            last_tested: new Date(),
            status: testResult.success ? 'connected' : 'error',
            error_message: testResult.success ? null : testResult.message,
        });

        res.json({
            success: true,
            data: {
                provider,
                connected: testResult.success,
                message: testResult.message,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteSettings(req: Request, res: Response, next: NextFunction) {
    try {
        const provider = validateProvider(req.params.provider);
        const db = getDb();

        const deleted = await db('provider_settings').where('provider', provider).delete();

        if (deleted === 0) {
            throw new NotFoundError(`Settings for provider ${provider} not found`);
        }

        res.json({ success: true, message: `Settings for ${provider} deleted` });
    } catch (error) {
        next(error);
    }
}

// Provider-specific test functions
async function testOpenAI(apiKey: string, endpointUrl?: string): Promise<{ success: boolean; message: string }> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
        apiKey,
        baseURL: endpointUrl || undefined,
    });

    // List models to verify connection
    await client.models.list();
    return { success: true, message: 'Connected to OpenAI successfully' };
}

async function testGemini(apiKey: string): Promise<{ success: boolean; message: string }> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get model to verify connection
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    await model.countTokens('test');
    return { success: true, message: 'Connected to Google Gemini successfully' };
}

async function testClaude(apiKey: string): Promise<{ success: boolean; message: string }> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    // Send a minimal request to verify connection
    await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
    });
    return { success: true, message: 'Connected to Anthropic Claude successfully' };
}
