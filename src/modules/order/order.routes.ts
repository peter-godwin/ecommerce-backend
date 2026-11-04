import { Router } from 'express';
import {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getOrderStats
} from './order.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.post('/', authMiddleware, createOrder);
router.get('/stats', authMiddleware, roleMiddleware(['admin']), getOrderStats);
router.get('/stats/overview', authMiddleware, roleMiddleware(['admin']), getOrderStats);
router.get('/admin/stats', authMiddleware, roleMiddleware(['admin']), getOrderStats);
router.get('/my-orders', authMiddleware, getMyOrders);
router.get('/:id', authMiddleware, getOrderById);
router.put('/:id/cancel', authMiddleware, cancelOrder);

router.put('/:id/status', authMiddleware, roleMiddleware(['admin']), updateOrderStatus);

export default router;