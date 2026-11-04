import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ReviewService } from './review.service';
import {
    validateCreateReview,
    validateUpdateReview,
    validateRespondToReview,
} from './review.dto';

export const createReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateCreateReview(req.body);
    const review = await ReviewService.createReview(req.user._id.toString(), dto);

    res.status(201).json({
        success: true,
        message: 'Review created successfully',
        review,
    });
});

export const getProductReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }

    const query: {
        page?: number;
        limit?: number;
        rating?: number | { $gte: number };
        minRating?: number;
        verified?: boolean;
        sortBy?: string;
    } = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        rating: req.query.rating ? Number(req.query.rating) : undefined,
        minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
        verified: req.query.verified === 'true',
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
    };

    const result = await ReviewService.getProductReviews(productId, query);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const getUserReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const reviews = await ReviewService.getUserReviews(req.user._id.toString());

    res.status(200).json({
        success: true,
        count: reviews.length,
        reviews,
    });
});

export const getReviewById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid review ID' });
        return;
    }
    const review = await ReviewService.getReviewById(id);

    if (!review) {
        res.status(404).json({ success: false, message: 'Review not found' });
        return;
    }

    res.status(200).json({
        success: true,
        review,
    });
});

export const updateReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid review ID' });
        return;
    }
    const dto = validateUpdateReview(req.body);

    const review = await ReviewService.updateReview(id, req.user._id.toString(), dto);

    if (!review) {
        res.status(404).json({ success: false, message: 'Review not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        review,
    });
});

export const deleteReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid review ID' });
        return;
    }
    await ReviewService.deleteReview(id, req.user._id.toString(), req.user.role === 'admin');

    res.status(200).json({
        success: true,
        message: 'Review deleted successfully',
    });
});

export const voteReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid review ID' });
        return;
    }
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
        res.status(400).json({ success: false, message: 'Helpful must be a boolean' });
        return;
    }

    const review = await ReviewService.voteReview(id, req.user._id.toString(), helpful);

    res.status(200).json({
        success: true,
        message: helpful ? 'Voted as helpful' : 'Voted as unhelpful',
        review,
    });
});

export const moderateReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid review ID' });
        return;
    }
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
        res.status(400).json({ success: false, message: 'Approved must be a boolean' });
        return;
    }

    const review = await ReviewService.moderateReview(id, approved);

    if (!review) {
        res.status(404).json({ success: false, message: 'Review not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: approved ? 'Review approved' : 'Review rejected',
        review,
    });
});

export const respondToReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid review ID' });
        return;
    }
    const dto = validateRespondToReview(req.body);

    const review = await ReviewService.respondToReview(id, req.user._id.toString(), dto);

    if (!review) {
        res.status(404).json({ success: false, message: 'Review not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Response added successfully',
        review,
    });
});

export const getPendingReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const reviews = await ReviewService.getPendingReviews();

    res.status(200).json({
        success: true,
        count: reviews.length,
        reviews,
    });
});