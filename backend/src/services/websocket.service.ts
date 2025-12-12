import { Server as SocketIOServer, Socket } from 'socket.io';
import { TaskEvent, NotificationEvent } from '../types';

let io: SocketIOServer | null = null;

export function initializeWebSocket(socketServer: SocketIOServer): void {
    io = socketServer;

    io.on('connection', (socket: Socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

export function getWebSocketService() {
    if (!io) {
        return null;
    }

    return {
        emitTaskEvent(event: TaskEvent): void {
            io?.emit(`task:${event.status}`, event);
        },

        emitTaskProgress(taskId: string, progress: number): void {
            io?.emit('task:progress', { taskId, progress });
        },

        emitNotification(notification: NotificationEvent): void {
            io?.emit('notification', notification);
        },

        getConnectedClients(): number {
            return io?.sockets.sockets.size || 0;
        },
    };
}
