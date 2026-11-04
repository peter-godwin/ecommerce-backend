import { Review, IReview } from './review.model';
import { Product } from '../product/product.model';
import { Order } from '../order/order.model';
import { CreateReviewDTO, UpdateReviewDTO, ReviewQueryDTO, RespondToReviewDTO } from './review.dto';
import mongoose from 'mongoose';
import { NotificationService } from '../notification/notification.service';

export class ReviewService {
    static async createReview(userId: string, dto: CreateReviewDTO): Promise<IReview> {
        if (!mongoose.Types.ObjectId.isValid(dto.productId)) {
            throw new Error('Invalid product ID');
        }

        const product = await Product.findById(dto.productId);
        if (!product) {
            throw new Error('Product not found');
        }

        const existingReview = await Review.findOne({
            product: dto.productId,
            user: userId,
        });

        if (existingReview) {
            throw new Error('You have already reviewed this product');
        }

        let isVerifiedPurchase = false;
        let orderId;

        if (dto.orderId) {
            const order = await Order.findOne({
                _id: dto.orderId,
                user: userId,
                paymentStatus: 'paid',
                'items.product': dto.productId,
            });

            if (order) {
                isVerifiedPurchase = true;
                orderId = order._id;
            }
        } else {
            const order = await Order.findOne({
                user: userId,
                status: 'delivered',
                paymentStatus: 'paid',
                'items.product': dto.productId,
            });

            if (order) {
                isVerifiedPurchase = true;
                orderId = order._id;
            }
        }

        const review = await Review.create({
            product: dto.productId,
            user: userId,
            order: orderId,
            rating: dto.rating,
            title: dto.title,
            comment: dto.comment,
            isVerifiedPurchase,
            isApproved: true,
        });

        return await review.populate([
            { path: 'user', select: 'name avatar' },
            { path: 'product', select: 'name' }
        ]);
    }

    static async getProductReviews(
        productId: string,
        query: {
            page?: number;
            limit?: number;
            rating?: number | { $gte: number };
            minRating?: number;
            verified?: boolean;
            sortBy?: string;
        } = {}
    ): Promise<{
        reviews: IReview[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
        stats: {
            avgRating: number;
            totalReviews: number;
            ratingDistribution: { rating: number; count: number }[];
        };
    }> {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter: {
            product: string;
            isApproved: boolean;
            rating?: number | { $gte: number };
            isVerifiedPurchase?: boolean;
        } = { product: productId, isApproved: true };

        if (query.rating) {
            filter.rating = Number(query.rating);
        }

        if (query.minRating) {
            filter.rating = { $gte: Number(query.minRating) };
        }

        if (query.verified) {
            filter.isVerifiedPurchase = true;
        }

        let sort: { [key: string]: 1 | -1 } = { createdAt: -1 };

        switch (query.sortBy) {
            case 'helpful':
                sort = { helpfulVotes: -1 };
                break;
            case 'rating_high':
                sort = { rating: -1, createdAt: -1 };
                break;
            case 'rating_low':
                sort = { rating: 1, createdAt: -1 };
                break;
            default:
                sort = { createdAt: -1 };
        }


        const [reviews, total, ratingStats] = await Promise.all([
            Review.find(filter)
                .populate('user', 'name avatar')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Review.countDocuments(filter),
            Review.aggregate([
                { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
                {
                    $group: {
                        _id: '$rating',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: -1 } },
            ]),
        ]);

        const totalReviews = await Review.countDocuments({
            product: productId,
            isApproved: true
        });

        const avgRatingResult = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
            { $group: { _id: null, avg: { $avg: '$rating' } } },
        ]);

        const avgRating = avgRatingResult.length > 0
            ? Math.round(avgRatingResult[0].avg * 10) / 10
            : 0;

        const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
            rating,
            count: ratingStats.find(s => s._id === rating)?.count || 0,
        }));

        return {
            reviews: reviews as IReview[],
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            stats: {
                avgRating,
                totalReviews,
                ratingDistribution,
            },
        };
    }

    static async getUserReviews(userId: string): Promise<IReview[]> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        return await Review.find({ user: userId })
            .populate('product', 'name images')
            .sort({ createdAt: -1 });
    }

    static async getReviewById(reviewId: string): Promise<IReview | null> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new Error('Invalid review ID');
        }

        return await Review.findById(reviewId)
            .populate('user', 'name avatar')
            .populate('product', 'name images');
    }

    static async updateReview(
        reviewId: string,
        userId: string,
        dto: UpdateReviewDTO
    ): Promise<IReview | null> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new Error('Invalid review ID');
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new Error('Review not found');
        }

        if (review.user.toString() !== userId) {
            throw new Error('Access denied');
        }

        if (dto.rating !== undefined) review.rating = dto.rating;
        if (dto.title !== undefined) review.title = dto.title;
        if (dto.comment !== undefined) review.comment = dto.comment;

        await review.save();

        return await review.populate([
            { path: 'user', select: 'name avatar' },
            { path: 'product', select: 'name' }
        ]);
    }

    static async deleteReview(reviewId: string, userId: string, isAdmin: boolean = false): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new Error('Invalid review ID');
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new Error('Review not found');
        }

        if (!isAdmin && review.user.toString() !== userId) {
            throw new Error('Access denied');
        }

        await review.deleteOne();
    }

    static async voteReview(
        reviewId: string,
        userId: string,
        helpful: boolean
    ): Promise<IReview | null> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new Error('Invalid review ID');
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new Error('Review not found');
        }

        const userIdObj = new mongoose.Types.ObjectId(userId);
        const hasVoted = review.votedBy.some(id => id.toString() === userId);

        if (hasVoted) {
            throw new Error('You have already voted on this review');
        }

        if (helpful) {
            review.helpfulVotes += 1;
        } else {
            review.unhelpfulVotes += 1;
        }

        review.votedBy.push(userIdObj);
        await review.save();

        return review;
    }

    static async moderateReview(reviewId: string, approved: boolean): Promise<IReview | null> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new Error('Invalid review ID');
        }

        const review = await Review.findByIdAndUpdate(
            reviewId,
            { isApproved: approved },
            { new: true }
        );

        return review;
    }

    static async respondToReview(
        reviewId: string,
        adminId: string,
        dto: RespondToReviewDTO
    ): Promise<IReview | null> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new Error('Invalid review ID');
        }

        const review = await Review.findById(reviewId).populate('user', 'name email');
        if (!review) {
            throw new Error('Review not found');
        }

        review.response = {
            text: dto.text,
            respondedBy: new mongoose.Types.ObjectId(adminId),
            respondedAt: new Date(),
        };

        await review.save();

        const reviewUser = review.user as unknown as { _id: { toString(): string }; email?: string };
        try {
            await NotificationService.sendNotification({
                userId: reviewUser._id.toString(),
                type: 'review_reply',
                title: 'Response to Your Review',
                message: 'We have responded to your product review.',
                priority: 'low',
                relatedProduct: review.product.toString(),
                actionUrl: `/products/${review.product}`,
                userEmail: reviewUser.email,
            });
            console.log(`Review reply notification sent to ${reviewUser.email}`);
        } catch (error) {
            console.error('Failed to send review reply notification:', error);
        }

        return await review.populate([
            { path: 'user', select: 'name avatar' },
            { path: 'response.respondedBy', select: 'name' }
        ]);
    }

    static async getPendingReviews(): Promise<IReview[]> {
        return await Review.find({ isApproved: false })
            .populate('user', 'name email')
            .populate('product', 'name')
            .sort({ createdAt: -1 });
    }
}