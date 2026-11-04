import { Router } from 'express';
import {
    createCoupon,
    getAllCoupons,
    getPublicCoupons,
    getCouponById,
    validateCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponStats,
} from './coupon.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/public', getPublicCoupons);

router.post('/validate', authMiddleware, validateCoupon);

router.post('/', authMiddleware, roleMiddleware(['admin']), createCoupon);
router.get('/', authMiddleware, roleMiddleware(['admin']), getAllCoupons);
router.get('/:id', authMiddleware, roleMiddleware(['admin']), getCouponById);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateCoupon);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteCoupon);
router.get('/:id/stats', authMiddleware, roleMiddleware(['admin']), getCouponStats);

export default router;