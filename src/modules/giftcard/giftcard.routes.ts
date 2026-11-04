import { Router } from 'express';
import {
    purchaseGiftCard,
    checkGiftCard,
    redeemGiftCard,
    getUserGiftCards,
    issuePromoGiftCard,
    adjustBalance,
    voidGiftCard,
    getAllGiftCards,
    getGiftCardStats,
} from './giftcard.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/check/:code', checkGiftCard);

router.post('/', authMiddleware, purchaseGiftCard);
router.get('/my-cards', authMiddleware, getUserGiftCards);
router.post('/redeem', authMiddleware, redeemGiftCard);

router.get('/admin/all', authMiddleware, roleMiddleware(['admin']), getAllGiftCards);
router.get('/admin/stats', authMiddleware, roleMiddleware(['admin']), getGiftCardStats);
router.post('/admin/issue', authMiddleware, roleMiddleware(['admin']), issuePromoGiftCard);
router.put('/admin/:code/adjust', authMiddleware, roleMiddleware(['admin']), adjustBalance);
router.put('/admin/:code/void', authMiddleware, roleMiddleware(['admin']), voidGiftCard);

export default router;