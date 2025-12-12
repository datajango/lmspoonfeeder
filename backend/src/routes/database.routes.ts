import { Router } from 'express';
import {
    listTables,
    getTableSchema,
    getTableData,
} from '../controllers/database.controller';

const router = Router();

router.get('/tables', listTables);
router.get('/tables/:tableName/schema', getTableSchema);
router.get('/tables/:tableName/data', getTableData);

export default router;
