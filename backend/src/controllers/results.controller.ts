import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { NotFoundError } from '../middleware/error.middleware';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

export async function listResults(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const { type, page = '1', limit = '20' } = req.query;

        let query = db('results')
            .join('tasks', 'results.task_id', 'tasks.id')
            .select(
                'results.*',
                'tasks.name as task_name',
                'tasks.provider as task_provider'
            )
            .orderBy('results.created_at', 'desc');

        if (type) {
            query = query.where('results.type', type);
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        const results = await query.limit(limitNum).offset(offset);
        const [{ count }] = await db('results').count('id as count');

        res.json({
            success: true,
            data: results,
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

export async function getResult(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = await db('results')
            .join('tasks', 'results.task_id', 'tasks.id')
            .select(
                'results.*',
                'tasks.name as task_name',
                'tasks.provider as task_provider',
                'tasks.prompt as task_prompt'
            )
            .where('results.id', id)
            .first();

        if (!result) {
            throw new NotFoundError(`Result ${id} not found`);
        }

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function downloadResult(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = await db('results').where('id', id).first();

        if (!result) {
            throw new NotFoundError(`Result ${id} not found`);
        }

        // For text results, return as text file
        if (result.type === 'text') {
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Disposition', `attachment; filename=result_${id}.txt`);
            res.send(result.content);
            return;
        }

        // For media results, content should be a file path
        const filePath = path.join(config.storagePath, result.content);

        if (!fs.existsSync(filePath)) {
            throw new NotFoundError('File not found');
        }

        res.download(filePath);
    } catch (error) {
        next(error);
    }
}

export async function deleteResult(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = await db('results').where('id', id).first();

        if (!result) {
            throw new NotFoundError(`Result ${id} not found`);
        }

        // Delete file if it exists
        if (result.type !== 'text' && result.content) {
            const filePath = path.join(config.storagePath, result.content);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await db('results').where('id', id).delete();

        res.json({ success: true, message: `Result ${id} deleted` });
    } catch (error) {
        next(error);
    }
}
