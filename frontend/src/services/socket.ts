import { io, Socket } from 'socket.io-client';
import type { TaskEvent, NotificationEvent } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io('/', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });

        socket.on('connect', () => {
            console.log('WebSocket connected');
        });

        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
    }
    return socket;
}

export function subscribeToTaskEvents(
    onEvent: (event: TaskEvent) => void
): () => void {
    const sock = getSocket();

    const handlers = {
        'task:pending': (e: TaskEvent) => onEvent({ ...e, status: 'pending' }),
        'task:running': (e: TaskEvent) => onEvent({ ...e, status: 'running' }),
        'task:progress': (e: TaskEvent) => onEvent(e),
        'task:complete': (e: TaskEvent) => onEvent({ ...e, status: 'complete' }),
        'task:failed': (e: TaskEvent) => onEvent({ ...e, status: 'failed' }),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
        sock.on(event, handler);
    });

    return () => {
        Object.keys(handlers).forEach((event) => {
            sock.off(event);
        });
    };
}

export function subscribeToNotifications(
    onNotification: (notification: NotificationEvent) => void
): () => void {
    const sock = getSocket();

    sock.on('notification', onNotification);

    return () => {
        sock.off('notification');
    };
}
