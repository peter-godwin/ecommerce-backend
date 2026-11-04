import { Schema, model, Document } from 'mongoose';

export interface IAnalyticsEvent extends Document {
    eventType: 'page_view' | 'product_view' | 'add_to_cart' | 'add_to_wishlist' | 'purchase' | 'search';
    userId?: Schema.Types.ObjectId;
    productId?: Schema.Types.ObjectId;
    orderId?: Schema.Types.ObjectId;
    metadata?: {
        searchQuery?: string;
        category?: string;
        source?: string;
        deviceType?: string;
        [key: string]: unknown;
    };
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>({
    eventType: {
        type: String,
        enum: ['page_view', 'product_view', 'add_to_cart', 'add_to_wishlist', 'purchase', 'search'],
        required: true,
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        index: true,
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
    sessionId: {
        type: String,
        index: true,
    },
    ipAddress: String,
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: false,
});

analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ productId: 1, createdAt: -1 });
analyticsEventSchema.index({ userId: 1, createdAt: -1 });

export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);