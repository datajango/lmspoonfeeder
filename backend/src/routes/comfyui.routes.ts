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
    listSessions,
    getSession,
    createSession,
    updateSession,
    deleteSession,
    submitPrompt,
    getOptions,
    generateWithParameters,
    getGenerationWorkflow,
    updateWorkflowParameters,
} from '../controllers/comfyui.controller';

const router = Router();

// Options (samplers, schedulers, checkpoints, etc.)
router.get('/options', getOptions);

// Sessions CRUD
router.get('/sessions', listSessions);
router.post('/sessions', createSession);
router.get('/sessions/:id', getSession);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

// Enhanced generation with full parameters
router.post('/sessions/:sessionId/generate', generateWithParameters);

// Direct prompt submission (legacy, still works)
router.post('/prompt', submitPrompt);

// Workflows CRUD
router.get('/workflows', listWorkflows);
router.post('/workflows', createWorkflow);
router.get('/workflows/:id', getWorkflow);
router.put('/workflows/:id', updateWorkflow);
router.patch('/workflows/:id/parameters', updateWorkflowParameters);
router.delete('/workflows/:id', deleteWorkflow);

// Execution
router.post('/workflows/:id/execute', executeWorkflow);
router.get('/workflows/:id/generations', listGenerations);

// Generations
router.get('/generations/:id', getGeneration);
router.get('/generations/:id/workflow', getGenerationWorkflow);

// Image proxy
router.get('/image/:filename', proxyImage);

export default router;


