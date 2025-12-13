import { Router } from 'express';
import {
    listTables,
    getTableSchema,
    getTableData,
    truncateTable,
    truncateAll,
    exportDatabase,
    importDatabase,
} from '../controllers/database.controller';

const router = Router();

router.get('/tables', listTables);
router.get('/tables/:tableName/schema', getTableSchema);
router.get('/tables/:tableName/data', getTableData);
router.delete('/tables/:tableName/truncate', truncateTable);
router.delete('/truncate-all', truncateAll);
router.get('/export', exportDatabase);
router.post('/import', importDatabase);

export default router;
