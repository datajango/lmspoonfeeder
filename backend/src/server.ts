import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { config } from './config';
import { getDb } from './db';
import { initializeWebSocket } from './services/websocket.service';

async function startServer(): Promise<void> {
    // Test database connection
    const db = getDb();
    try {
        await db.raw('SELECT 1');
        console.log('✓ Database connected');
    } catch (error) {
        console.error('✗ Database connection failed:', error);
        process.exit(1);
    }

    // Create Express app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new SocketIOServer(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    initializeWebSocket(io);
    console.log('✓ WebSocket initialized');

    // Start server
    server.listen(config.port, () => {
        console.log(`✓ Server running on port ${config.port}`);
        console.log(`  Environment: ${config.nodeEnv}`);
        console.log(`  Health check: http://localhost:${config.port}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('Shutting down...');
        server.close();
        await db.destroy();
        process.exit(0);
    });
}

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
