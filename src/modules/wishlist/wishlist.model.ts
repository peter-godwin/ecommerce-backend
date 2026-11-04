import { Schema, model, Document, Types } from 'mongoose';

interface IWishlistItem {
    product: Types.ObjectId;
    addedAt: Date;
}

export interface IWishlist extends Document {
    user: Types.ObjectId;
    items: IWishlistItem[];
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const wishlistItemSchema = new Schema<IWishlistItem>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

const wishlistSchema = new Schema<IWishlist>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: {
        type: [wishlistItemSchema],
        default: [],
        validate: {
            validator: (items: IWishlistItem[]) => items.length <= 100,
            message: 'Maximum 100 items allowed in wishlist'
        }
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'items.product': 1 });

export const Wishlist = model<IWishlist>('Wishlist', wishlistSchema);