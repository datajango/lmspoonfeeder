import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';

// List all conversations
export async function listConversations(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const conversations = await db('conversations')
            .orderBy('updated_at', 'desc')
            .select('*');

        res.json({ success: true, data: conversations });
    } catch (error) {
        next(error);
    }
}

// Get a single conversation with messages
export async function getConversation(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const conversation = await db('conversations').where('id', id).first();
        if (!conversation) {
            throw new NotFoundError(`Conversation ${id} not found`);
        }

        const messages = await db('messages')
            .where('conversation_id', id)
            .orderBy('created_at', 'asc')
            .select('*');

        res.json({
            success: true,
            data: {
                ...conversation,
                messages,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Create a new conversation
export async function createConversation(req: Request, res: Response, next: NextFunction) {
    try {
        const { title, provider, model } = req.body;

        if (!provider || !model) {
            throw new BadRequestError('provider and model are required');
        }

        const db = getDb();
        const [conversation] = await db('conversations').insert({
            title: title || 'New Conversation',
            provider,
            model,
        }).returning('*');

        res.status(201).json({ success: true, data: conversation });
    } catch (error) {
        next(error);
    }
}

// Add a message to a conversation
export async function addMessage(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { role, content } = req.body;

        if (!role || !content) {
            throw new BadRequestError('role and content are required');
        }

        const db = getDb();

        // Verify conversation exists
        const conversation = await db('conversations').where('id', id).first();
        if (!conversation) {
            throw new NotFoundError(`Conversation ${id} not found`);
        }

        // Add message
        const [message] = await db('messages').insert({
            conversation_id: id,
            role,
            content,
        }).returning('*');

        // Update conversation timestamp
        await db('conversations').where('id', id).update({
            updated_at: new Date(),
        });

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        next(error);
    }
}

// Update conversation title
export async function updateConversation(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const db = getDb();

        const existing = await db('conversations').where('id', id).first();
        if (!existing) {
            throw new NotFoundError(`Conversation ${id} not found`);
        }

        const [conversation] = await db('conversations').where('id', id).update({
            title,
            updated_at: new Date(),
        }).returning('*');

        res.json({ success: true, data: conversation });
    } catch (error) {
        next(error);
    }
}

// Delete a conversation
export async function deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const deleted = await db('conversations').where('id', id).delete();

        if (deleted === 0) {
            throw new NotFoundError(`Conversation ${id} not found`);
        }

        res.json({ success: true, message: `Conversation ${id} deleted` });
    } catch (error) {
        next(error);
    }
}
