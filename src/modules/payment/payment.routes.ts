import { Router } from 'express';
import {
    createPaymentIntent,
    getPaymentById,
    getPaymentByOrderId,
    getUserPayments,
    refundPayment,
    getPublishableKey,
    getPaymentStats,
    handleStripeWebhook, devUpdatePaymentStatus,
    createSetupIntent,
    savePaymentMethod,
    getSavedPaymentMethods,
} from './payment.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { env } from '../../config/env';

const router = Router();

router.get('/config', getPublishableKey);


router.post('/webhook', handleStripeWebhook);

router.post('/:id/refund', authMiddleware, roleMiddleware(['admin']), refundPayment);
router.get('/admin/stats', authMiddleware, roleMiddleware(['admin']), getPaymentStats);

router.post('/create-intent', authMiddleware, createPaymentIntent);
router.get('/my-payments', authMiddleware, getUserPayments);
router.get('/payment-methods', authMiddleware, getSavedPaymentMethods);
router.post('/setup-intent', authMiddleware, createSetupIntent);
router.post('/payment-methods', authMiddleware, savePaymentMethod);
router.get('/:id', authMiddleware, getPaymentById);
router.get('/order/:orderId', authMiddleware, getPaymentByOrderId);

if (env.devEndpointsEnabled) {
    router.put(
        '/dev/update-status/:paymentIntentId',
        authMiddleware,
        roleMiddleware(['admin']),
        devUpdatePaymentStatus
    );
}

export default router;