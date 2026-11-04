import { Router } from 'express';
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToCart,
    checkWishlist,
    togglePublicStatus,
    getPublicWishlist,
    getMostWishlisted,
    getWishlistCount,
} from './wishlist.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/public/:userId', getPublicWishlist);

router.get('/', authMiddleware, getWishlist);
router.get('/count', authMiddleware, getWishlistCount);
router.post('/', authMiddleware, addToWishlist);
router.delete('/:productId', authMiddleware, removeFromWishlist);
router.delete('/', authMiddleware, clearWishlist);
router.post('/move-to-cart', authMiddleware, moveToCart);
router.get('/check/:productId', authMiddleware, checkWishlist);
router.put('/toggle-public', authMiddleware, togglePublicStatus);

router.get('/admin/most-wishlisted', authMiddleware, roleMiddleware(['admin']), getMostWishlisted);

export default router;