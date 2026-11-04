import { Router } from 'express';
import {
    createTicket,
    getUserTickets,
    getTicketById,
    addMessage,
    rateTicket,
    getAllTickets,
    updateTicket,
    getSupportStats,
    getFAQs,
    getFAQById,
    voteFAQ,
    createFAQ,
    getAllFAQsAdmin,
    updateFAQ,
    deleteFAQ,
} from './support.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/faq', getFAQs);

router.get('/faq/admin/all', authMiddleware, roleMiddleware(['admin']), getAllFAQsAdmin);
router.post('/faq', authMiddleware, roleMiddleware(['admin']), createFAQ);

router.get('/faq/:id', getFAQById);
router.post('/faq/:id/vote', voteFAQ);

router.put('/faq/:id', authMiddleware, roleMiddleware(['admin']), updateFAQ);
router.delete('/faq/:id', authMiddleware, roleMiddleware(['admin']), deleteFAQ);


router.post('/tickets', authMiddleware, createTicket);
router.get('/tickets', authMiddleware, getUserTickets);
router.get('/tickets/:id', authMiddleware, getTicketById);
router.post('/tickets/:id/messages', authMiddleware, addMessage);
router.post('/tickets/:id/rate', authMiddleware, rateTicket);

router.get('/admin/tickets', authMiddleware, roleMiddleware(['admin']), getAllTickets);
router.put('/admin/tickets/:id', authMiddleware, roleMiddleware(['admin']), updateTicket);
router.get('/admin/stats', authMiddleware, roleMiddleware(['admin']), getSupportStats);

export default router;