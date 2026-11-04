import { Router } from 'express';
import {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    validateCart, applyCoupon, removeCoupon
} from './cart.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getCart);
router.post('/', authMiddleware, addToCart);
router.put('/:itemId', authMiddleware, updateCartItem);
router.delete('/:itemId', authMiddleware, removeFromCart);
router.delete('/', authMiddleware, clearCart);
router.get('/validate', authMiddleware, validateCart);
router.post('/apply-coupon', authMiddleware, applyCoupon);
router.delete('/remove-coupon', authMiddleware, removeCoupon);

export default router;