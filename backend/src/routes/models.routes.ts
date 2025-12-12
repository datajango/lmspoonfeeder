import { Router } from 'express';
import {
    listModels,
    getModelInfo,
    loadModel,
    unloadModel,
    getModelStatus,
} from '../controllers/models.controller';

const router = Router();

router.get('/', listModels);
router.get('/:name', getModelInfo);
router.post('/:name/load', loadModel);
router.post('/:name/unload', unloadModel);
router.get('/:name/status', getModelStatus);

export default router;
