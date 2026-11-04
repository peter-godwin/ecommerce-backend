import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
    product: Types.ObjectId;
    user: Types.ObjectId;
    order?: Types.ObjectId;
    rating: number;
    title: string;
    comment: string;
    images?: string[];
    isVerifiedPurchase: boolean;
    isApproved: boolean;
    helpfulVotes: number;
    unhelpfulVotes: number;
    votedBy: Types.ObjectId[];
    response?: {
        text: string;
        respondedBy: Types.ObjectId;
        respondedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
    },
    title: {
        type: String,
        required: [true, 'Review title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters'],
        maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        minlength: [10, 'Comment must be at least 10 characters'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    images: {
        type: [String],
        default: [],
        validate: {
            validator: (images: string[]) => images.length <= 5,
            message: 'Maximum 5 images allowed per review'
        }
    },
    isVerifiedPurchase: {
        type: Boolean,
        default: false,
    },
    isApproved: {
        type: Boolean,
        default: true,
    },
    helpfulVotes: {
        type: Number,
        default: 0,
        min: 0,
    },
    unhelpfulVotes: {
        type: Number,
        default: 0,
        min: 0,
    },
    votedBy: {
        type: [Schema.Types.ObjectId],
        ref: 'User',
        default: [],
    },
    response: {
        text: {
            type: String,
            maxlength: [500, 'Response cannot exceed 500 characters'],
        },
        respondedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        respondedAt: Date,
    },
}, {
    timestamps: true,
});

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

reviewSchema.post('save', async function() {
    await updateProductRating(this.product);
});

reviewSchema.post('remove' as unknown as 'save', async function() {
    await updateProductRating(this.product);
});

async function updateProductRating(productId: Types.ObjectId) {
    const Review = model<IReview>('Review');
    const Product = model('Product');

    const stats = await Review.aggregate([
        { $match: { product: productId, isApproved: true } },
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                numReviews: { $sum: 1 },
            },
        },
    ]);

    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            rating: Math.round(stats[0].avgRating * 10) / 10,
            numReviews: stats[0].numReviews,
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            rating: 0,
            numReviews: 0,
        });
    }
}

export const Review = model<IReview>('Review', reviewSchema);