import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { Task, TaskInput, TaskFilters } from '../types';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';
import { getWebSocketService } from '../services/websocket.service';

export async function listTasks(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const filters: TaskFilters = {
            status: req.query.status as any,
            type: req.query.type as any,
            provider: req.query.provider as any,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
        };

        let query = db('tasks').orderBy('created_at', 'desc');

        if (filters.status) {
            query = query.where('status', filters.status);
        }
        if (filters.type) {
            query = query.where('type', filters.type);
        }
        if (filters.provider) {
            query = query.where('provider', filters.provider);
        }

        const offset = (filters.page! - 1) * filters.limit!;
        const tasks = await query.limit(filters.limit!).offset(offset);

        const countQuery = db('tasks').count('id as count');
        if (filters.status) countQuery.where('status', filters.status);
        if (filters.type) countQuery.where('type', filters.type);
        if (filters.provider) countQuery.where('provider', filters.provider);

        const [{ count }] = await countQuery;

        res.json({
            success: true,
            data: tasks,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: parseInt(count as string),
                totalPages: Math.ceil(parseInt(count as string) / filters.limit!),
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
    try {
        const input: TaskInput = req.body;

        if (!input.name || !input.type || !input.provider || !input.prompt) {
            throw new BadRequestError('name, type, provider, and prompt are required');
        }

        const db = getDb();
        const [task] = await db('tasks').insert({
            name: input.name,
            type: input.type,
            provider: input.provider,
            prompt: input.prompt,
            options: input.options ? JSON.stringify(input.options) : null,
            status: 'pending',
        }).returning('*');

        // Emit WebSocket event
        const ws = getWebSocketService();
        if (ws) {
            ws.emitTaskEvent({
                taskId: task.id,
                status: 'pending',
            });
        }

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const task = await db('tasks').where('id', id).first();

        if (!task) {
            throw new NotFoundError(`Task ${id} not found`);
        }

        res.json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const task = await db('tasks').where('id', id).first();

        if (!task) {
            throw new NotFoundError(`Task ${id} not found`);
        }

        // Only allow deletion of pending or failed tasks
        if (task.status === 'running') {
            throw new BadRequestError('Cannot delete a running task');
        }

        await db('tasks').where('id', id).delete();

        res.json({ success: true, message: `Task ${id} deleted` });
    } catch (error) {
        next(error);
    }
}

export async function retryTask(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const task = await db('tasks').where('id', id).first();

        if (!task) {
            throw new NotFoundError(`Task ${id} not found`);
        }

        if (task.status !== 'failed') {
            throw new BadRequestError('Only failed tasks can be retried');
        }

        await db('tasks').where('id', id).update({
            status: 'pending',
            error: null,
            progress: 0,
            updated_at: new Date(),
        });

        // Emit WebSocket event
        const ws = getWebSocketService();
        if (ws) {
            ws.emitTaskEvent({
                taskId: id,
                status: 'pending',
            });
        }

        res.json({ success: true, message: `Task ${id} queued for retry` });
    } catch (error) {
        next(error);
    }
}

export async function getTaskHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const {
            dateFrom,
            dateTo,
            provider,
            type,
            status,
            search,
            page = '1',
            limit = '20',
        } = req.query;

        let query = db('tasks')
            .whereIn('status', ['complete', 'failed'])
            .orderBy('created_at', 'desc');

        if (dateFrom) {
            query = query.where('created_at', '>=', new Date(dateFrom as string));
        }
        if (dateTo) {
            query = query.where('created_at', '<=', new Date(dateTo as string));
        }
        if (provider) {
            query = query.where('provider', provider);
        }
        if (type) {
            query = query.where('type', type);
        }
        if (status) {
            query = query.where('status', status);
        }
        if (search) {
            query = query.where((builder) => {
                builder.where('name', 'ilike', `%${search}%`)
                    .orWhere('prompt', 'ilike', `%${search}%`);
            });
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        const tasks = await query.clone().limit(limitNum).offset(offset);

        // Build count query separately without ORDER BY
        let countQuery = db('tasks').whereIn('status', ['complete', 'failed']);
        if (dateFrom) countQuery = countQuery.where('created_at', '>=', new Date(dateFrom as string));
        if (dateTo) countQuery = countQuery.where('created_at', '<=', new Date(dateTo as string));
        if (provider) countQuery = countQuery.where('provider', provider);
        if (type) countQuery = countQuery.where('type', type);
        if (status) countQuery = countQuery.where('status', status);
        if (search) {
            countQuery = countQuery.where((builder) => {
                builder.where('name', 'ilike', `%${search}%`)
                    .orWhere('prompt', 'ilike', `%${search}%`);
            });
        }
        const [{ count }] = await countQuery.count('id as count');

        res.json({
            success: true,
            data: tasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: parseInt(count as string),
                totalPages: Math.ceil(parseInt(count as string) / limitNum),
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function exportHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const format = req.query.format || 'json';

        const tasks = await db('tasks')
            .whereIn('status', ['complete', 'failed'])
            .orderBy('created_at', 'desc');

        if (format === 'csv') {
            const headers = ['id', 'name', 'type', 'provider', 'status', 'created_at', 'completed_at'];
            const csv = [
                headers.join(','),
                ...tasks.map((t) => headers.map((h) => JSON.stringify(t[h] ?? '')).join(',')),
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=task_history.csv');
            res.send(csv);
        } else {
            res.json({ success: true, data: tasks });
        }
    } catch (error) {
        next(error);
    }
}
