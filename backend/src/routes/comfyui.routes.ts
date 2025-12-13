import { Router } from 'express';
import {
    listWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    getGeneration,
    proxyImage,
    listGenerations,
} from '../controllers/comfyui.controller';

const router = Router();

// Workflows CRUD
router.get('/workflows', listWorkflows);
router.post('/workflows', createWorkflow);
router.get('/workflows/:id', getWorkflow);
router.put('/workflows/:id', updateWorkflow);
router.delete('/workflows/:id', deleteWorkflow);

// Execution
router.post('/workflows/:id/execute', executeWorkflow);
router.get('/workflows/:id/generations', listGenerations);
router.get('/generations/:id', getGeneration);

// Image proxy
router.get('/image/:filename', proxyImage);

export default router;
