import { Router } from 'express';
import {
    listResults,
    getResult,
    downloadResult,
    deleteResult,
} from '../controllers/results.controller';

const router = Router();

router.get('/', listResults);
router.get('/:id', getResult);
router.get('/:id/download', downloadResult);
router.delete('/:id', deleteResult);

export default router;
