import { Router } from 'express';
import {
    listTasks,
    createTask,
    getTask,
    deleteTask,
    retryTask,
    getTaskHistory,
    exportHistory,
} from '../controllers/tasks.controller';

const router = Router();

// History routes (must be before :id routes)
router.get('/history', getTaskHistory);
router.get('/history/export', exportHistory);

// CRUD routes
router.get('/', listTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.delete('/:id', deleteTask);
router.post('/:id/retry', retryTask);

export default router;
