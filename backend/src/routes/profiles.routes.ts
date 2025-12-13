import { Router } from 'express';
import {
    listProfiles,
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile,
    listProfileModels,
    addProfileModel,
    deleteProfileModel,
    syncProfileModels,
    testConnection,
} from '../controllers/profiles.controller';

const router = Router();

router.get('/', listProfiles);
router.post('/', createProfile);
router.post('/test-connection', testConnection);
router.get('/:id', getProfile);
router.get('/:id/models', listProfileModels);
router.post('/:id/models', addProfileModel);
router.delete('/:id/models/:modelId', deleteProfileModel);
router.post('/:id/models/sync', syncProfileModels);
router.put('/:id', updateProfile);
router.delete('/:id', deleteProfile);

export default router;
