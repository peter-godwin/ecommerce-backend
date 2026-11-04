import { Router } from 'express';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getPreferences,
    updatePreferences,
    sendBulkNotifications,
} from './notification.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/', authMiddleware, getNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.put('/:id/read', authMiddleware, markAsRead);
router.put('/:id/unread', authMiddleware, markAsUnread);
router.put('/mark-all-read', authMiddleware, markAllAsRead);
router.delete('/:id', authMiddleware, deleteNotification);
router.delete('/', authMiddleware, deleteAllNotifications);

router.get('/preferences', authMiddleware, getPreferences);
router.put('/preferences', authMiddleware, updatePreferences);

router.post('/bulk', authMiddleware, roleMiddleware(['admin']), sendBulkNotifications);

export default router;