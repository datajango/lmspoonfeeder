import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

// Allowed tables to prevent SQL injection
const ALLOWED_TABLES = ['provider_settings', 'tasks', 'results', 'profiles', 'conversations', 'messages'];

export async function listTables(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();

        // Get table info from PostgreSQL
        const tables = await db.raw(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'knex_%'
      ORDER BY table_name
    `);

        // Get row counts for each table
        const tablesWithCounts = await Promise.all(
            tables.rows.map(async (table: any) => {
                const [{ count }] = await db(table.table_name).count('* as count');
                return {
                    name: table.table_name,
                    columnCount: parseInt(table.column_count),
                    rowCount: parseInt(count as string),
                };
            })
        );

        res.json({ success: true, data: tablesWithCounts });
    } catch (error) {
        next(error);
    }
}

export async function getTableSchema(req: Request, res: Response, next: NextFunction) {
    try {
        const { tableName } = req.params;

        if (!ALLOWED_TABLES.includes(tableName)) {
            throw new NotFoundError(`Table ${tableName} not found`);
        }

        const db = getDb();

        const columns = await db.raw(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = ?
      ORDER BY ordinal_position
    `, [tableName]);

        res.json({
            success: true,
            data: columns.rows.map((col: any) => ({
                name: col.column_name,
                type: col.data_type,
                nullable: col.is_nullable === 'YES',
                default: col.column_default,
            })),
        });
    } catch (error) {
        next(error);
    }
}

export async function getTableData(req: Request, res: Response, next: NextFunction) {
    try {
        const { tableName } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const sortBy = req.query.sortBy as string || 'created_at';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        if (!ALLOWED_TABLES.includes(tableName)) {
            throw new NotFoundError(`Table ${tableName} not found`);
        }

        const db = getDb();
        const offset = (page - 1) * limit;

        // Get data
        const data = await db(tableName)
            .orderBy(sortBy, sortOrder)
            .limit(limit)
            .offset(offset);

        // Get total count
        const [{ count }] = await db(tableName).count('* as count');
        const total = parseInt(count as string);

        res.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
}
