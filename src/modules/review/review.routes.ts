import { Router } from 'express';
import {
    createReview,
    getProductReviews,
    getUserReviews,
    getReviewById,
    updateReview,
    deleteReview,
    voteReview,
    moderateReview,
    respondToReview,
    getPendingReviews,
} from './review.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/products/:productId', getProductReviews);
router.get('/:id', getReviewById);

router.post('/', authMiddleware, createReview);
router.get('/user/my-reviews', authMiddleware, getUserReviews);
router.put('/:id', authMiddleware, updateReview);
router.delete('/:id', authMiddleware, deleteReview);
router.post('/:id/vote', authMiddleware, voteReview);

router.get('/admin/pending', authMiddleware, roleMiddleware(['admin']), getPendingReviews);
router.put('/:id/moderate', authMiddleware, roleMiddleware(['admin']), moderateReview);
router.post('/:id/respond', authMiddleware, roleMiddleware(['admin']), respondToReview);

export default router;