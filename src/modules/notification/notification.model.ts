import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
    | 'order_placed'
    | 'order_confirmed'
    | 'order_shipped'
    | 'order_delivered'
    | 'order_cancelled'
    | 'payment_success'
    | 'payment_failed'
    | 'review_reply'
    | 'price_drop'
    | 'back_in_stock'
    | 'promotion'
    | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface INotification extends Document {
    user: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    isRead: boolean;
    readAt?: Date;
    relatedOrder?: Types.ObjectId;
    relatedProduct?: Types.ObjectId;
    actionUrl?: string;
    metadata?: {
        [key: string]: unknown;
    };
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: [
            'order_placed',
            'order_confirmed',
            'order_shipped',
            'order_delivered',
            'order_cancelled',
            'payment_success',
            'payment_failed',
            'review_reply',
            'price_drop',
            'back_in_stock',
            'promotion',
            'system',
        ],
        required: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 100,
    },
    message: {
        type: String,
        required: true,
        maxlength: 500,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    readAt: {
        type: Date,
    },
    relatedOrder: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
    },
    relatedProduct: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
    },
    actionUrl: {
        type: String,
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
    expiresAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = model<INotification>('Notification', notificationSchema);