import { Router } from 'express';
import {
    getAllSettings,
    getSettingsByProvider,
    updateSettings,
    testConnection,
    deleteSettings,
} from '../controllers/settings.controller';

const router = Router();

router.get('/', getAllSettings);
router.get('/:provider', getSettingsByProvider);
router.put('/:provider', updateSettings);
router.post('/:provider/test', testConnection);
router.delete('/:provider', deleteSettings);

export default router;
