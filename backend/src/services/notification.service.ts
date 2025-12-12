import { getWebSocketService } from './websocket.service';
import { v4 as uuidv4 } from 'uuid';

export function sendTaskComplete(taskId: string, taskName: string): void {
    const ws = getWebSocketService();
    if (ws) {
        ws.emitNotification({
            id: uuidv4(),
            type: 'success',
            title: 'Task Complete',
            message: `Task "${taskName}" completed successfully`,
            taskId,
            timestamp: new Date(),
        });
    }
}

export function sendTaskFailed(taskId: string, taskName: string, error: string): void {
    const ws = getWebSocketService();
    if (ws) {
        ws.emitNotification({
            id: uuidv4(),
            type: 'error',
            title: 'Task Failed',
            message: `Task "${taskName}" failed: ${error}`,
            taskId,
            timestamp: new Date(),
        });
    }
}

export function sendInfo(message: string): void {
    const ws = getWebSocketService();
    if (ws) {
        ws.emitNotification({
            id: uuidv4(),
            type: 'info',
            title: 'Info',
            message,
            timestamp: new Date(),
        });
    }
}

export function sendWarning(message: string): void {
    const ws = getWebSocketService();
    if (ws) {
        ws.emitNotification({
            id: uuidv4(),
            type: 'warning',
            title: 'Warning',
            message,
            timestamp: new Date(),
        });
    }
}
