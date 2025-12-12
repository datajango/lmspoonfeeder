import { Router } from 'express';
import {
    listProfiles,
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile,
} from '../controllers/profiles.controller';

const router = Router();

router.get('/', listProfiles);
router.post('/', createProfile);
router.get('/:id', getProfile);
router.put('/:id', updateProfile);
router.delete('/:id', deleteProfile);

export default router;
