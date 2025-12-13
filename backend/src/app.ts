import express, { Application } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware';

// Import routes
import modelsRoutes from './routes/models.routes';
import settingsRoutes from './routes/settings.routes';
import tasksRoutes from './routes/tasks.routes';
import resultsRoutes from './routes/results.routes';
import profilesRoutes from './routes/profiles.routes';
import databaseRoutes from './routes/database.routes';
import chatRoutes from './routes/chat.routes';
import conversationsRoutes from './routes/conversations.routes';
import comfyuiRoutes from './routes/comfyui.routes';

export function createApp(): Application {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Routes
    app.use('/api/models', modelsRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/tasks', tasksRoutes);
    app.use('/api/results', resultsRoutes);
    app.use('/api/profiles', profilesRoutes);
    app.use('/api/database', databaseRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/conversations', conversationsRoutes);
    app.use('/api/comfyui', comfyuiRoutes);

    // Error handling
    app.use(errorHandler);

    return app;
}
