import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

// Allowed tables to prevent SQL injection
const ALLOWED_TABLES = ['provider_settings', 'tasks', 'results', 'profiles', 'conversations', 'messages', 'profile_models', 'comfyui_workflows', 'comfyui_generations', 'comfyui_sessions'];

// Order for truncating (children first to respect FK constraints)
const TRUNCATE_ORDER = ['comfyui_generations', 'comfyui_sessions', 'comfyui_workflows', 'messages', 'conversations', 'profile_models', 'results', 'tasks', 'profiles', 'provider_settings'];

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

export async function truncateTable(req: Request, res: Response, next: NextFunction) {
    try {
        const { tableName } = req.params;

        if (!ALLOWED_TABLES.includes(tableName)) {
            throw new NotFoundError(`Table ${tableName} not found`);
        }

        const db = getDb();
        const deleted = await db(tableName).delete();

        res.json({ success: true, message: `Deleted ${deleted} rows from ${tableName}` });
    } catch (error) {
        next(error);
    }
}

export async function truncateAll(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const results: Record<string, number> = {};

        // Truncate in order to respect FK constraints
        for (const tableName of TRUNCATE_ORDER) {
            try {
                const deleted = await db(tableName).delete();
                results[tableName] = deleted;
            } catch {
                results[tableName] = 0;
            }
        }

        res.json({ success: true, message: 'All tables truncated', data: results });
    } catch (error) {
        next(error);
    }
}

export async function exportDatabase(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const exportData: Record<string, any[]> = {};

        for (const tableName of ALLOWED_TABLES) {
            try {
                exportData[tableName] = await db(tableName).select('*');
            } catch {
                exportData[tableName] = [];
            }
        }

        res.json({
            success: true,
            data: exportData,
            exportedAt: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
}

export async function importDatabase(req: Request, res: Response, next: NextFunction) {
    try {
        const { data, truncateFirst } = req.body;

        if (!data || typeof data !== 'object') {
            throw new BadRequestError('Invalid import data');
        }

        const db = getDb();
        const results: Record<string, number> = {};

        // If truncateFirst, clear tables in order
        if (truncateFirst) {
            for (const tableName of TRUNCATE_ORDER) {
                if (ALLOWED_TABLES.includes(tableName)) {
                    try {
                        await db(tableName).delete();
                    } catch {
                        // ignore
                    }
                }
            }
        }

        // Import in reverse order (parents first)
        const importOrder = [...TRUNCATE_ORDER].reverse();

        for (const tableName of importOrder) {
            if (data[tableName] && Array.isArray(data[tableName]) && data[tableName].length > 0) {
                try {
                    await db(tableName).insert(data[tableName]);
                    results[tableName] = data[tableName].length;
                } catch (e: any) {
                    results[tableName] = 0;
                }
            }
        }

        res.json({ success: true, message: 'Import complete', data: results });
    } catch (error) {
        next(error);
    }
}
