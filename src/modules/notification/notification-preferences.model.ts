import { Schema, model, Document, Types } from 'mongoose';

export interface INotificationPreferences extends Document {
    user: Types.ObjectId;
    email: {
        orderUpdates: boolean;
        promotions: boolean;
        newsletter: boolean;
        priceDrops: boolean;
        backInStock: boolean;
    };
    inApp: {
        orderUpdates: boolean;
        promotions: boolean;
        priceDrops: boolean;
        backInStock: boolean;
        reviews: boolean;
    };
    push: {
        orderUpdates: boolean;
        promotions: boolean;
        priceDrops: boolean;
        backInStock: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const notificationPreferencesSchema = new Schema<INotificationPreferences>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    email: {
        orderUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
        newsletter: { type: Boolean, default: false },
        priceDrops: { type: Boolean, default: true },
        backInStock: { type: Boolean, default: true },
    },
    inApp: {
        orderUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
        priceDrops: { type: Boolean, default: true },
        backInStock: { type: Boolean, default: true },
        reviews: { type: Boolean, default: true },
    },
    push: {
        orderUpdates: { type: Boolean, default: false },
        promotions: { type: Boolean, default: false },
        priceDrops: { type: Boolean, default: false },
        backInStock: { type: Boolean, default: false },
    },
}, {
    timestamps: true,
});

export const NotificationPreferences = model<INotificationPreferences>(
    'NotificationPreferences',
    notificationPreferencesSchema
);