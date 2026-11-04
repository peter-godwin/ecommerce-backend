import { Router } from 'express';
import {
    getDashboardOverview,
    getSalesReport,
    getRevenueAnalytics,
    getProductAnalytics,
    getUserAnalytics,
    getOrderAnalytics,
    trackEvent,
} from './analytics.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get(
    '/dashboard',
    authMiddleware,
    roleMiddleware(['admin']),
    getDashboardOverview
);

router.get(
    '/sales',
    authMiddleware,
    roleMiddleware(['admin']),
    getSalesReport
);

router.get(
    '/revenue',
    authMiddleware,
    roleMiddleware(['admin']),
    getRevenueAnalytics
);

router.get(
    '/products',
    authMiddleware,
    roleMiddleware(['admin']),
    getProductAnalytics
);

router.get(
    '/users',
    authMiddleware,
    roleMiddleware(['admin']),
    getUserAnalytics
);

router.get(
    '/orders',
    authMiddleware,
    roleMiddleware(['admin']),
    getOrderAnalytics
);

router.post('/track', trackEvent);

export default router;