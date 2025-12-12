import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'spoonfeeder',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },

    // Redis
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },

    // External Services
    ollama: {
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
    },
    comfyui: {
        url: process.env.COMFYUI_URL || 'http://localhost:8188',
    },

    // Security
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production',

    // Storage
    storagePath: process.env.MEDIA_STORAGE_PATH || path.join(__dirname, '../../storage/media'),
};
