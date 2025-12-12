import { Router } from 'express';
import { listChatSources, chat } from '../controllers/chat.controller';

const router = Router();

router.get('/sources', listChatSources);
router.post('/', chat);

export default router;
