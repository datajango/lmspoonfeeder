import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { ProfileInput } from '../types';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';

export async function listProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const profiles = await db('profiles').orderBy('name', 'asc');

        res.json({ success: true, data: profiles });
    } catch (error) {
        next(error);
    }
}

export async function createProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const input: ProfileInput = req.body;

        if (!input.name || !input.type || !input.provider) {
            throw new BadRequestError('name, type, and provider are required');
        }

        const db = getDb();
        const [profile] = await db('profiles').insert({
            name: input.name,
            description: input.description || null,
            type: input.type,
            provider: input.provider,
            options: input.options ? JSON.stringify(input.options) : null,
            prompt_template: input.promptTemplate || null,
        }).returning('*');

        res.status(201).json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const profile = await db('profiles').where('id', id).first();

        if (!profile) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const input: Partial<ProfileInput> = req.body;
        const db = getDb();

        const existing = await db('profiles').where('id', id).first();

        if (!existing) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        const updateData: any = { updated_at: new Date() };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.type !== undefined) updateData.type = input.type;
        if (input.provider !== undefined) updateData.provider = input.provider;
        if (input.options !== undefined) updateData.options = JSON.stringify(input.options);
        if (input.promptTemplate !== undefined) updateData.prompt_template = input.promptTemplate;

        const [profile] = await db('profiles').where('id', id).update(updateData).returning('*');

        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
}

export async function deleteProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const deleted = await db('profiles').where('id', id).delete();

        if (deleted === 0) {
            throw new NotFoundError(`Profile ${id} not found`);
        }

        res.json({ success: true, message: `Profile ${id} deleted` });
    } catch (error) {
        next(error);
    }
}
