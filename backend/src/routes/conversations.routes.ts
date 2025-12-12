import { Router } from 'express';
import {
    listConversations,
    getConversation,
    createConversation,
    addMessage,
    updateConversation,
    deleteConversation,
} from '../controllers/conversations.controller';

const router = Router();

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.put('/:id', updateConversation);
router.delete('/:id', deleteConversation);
router.post('/:id/messages', addMessage);

export default router;
