import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus =
    | 'pending'
    | 'processing'
    | 'succeeded'
    | 'failed'
    | 'canceled'
    | 'refunded';

export type PaymentMethod = 'card' | 'bank_transfer' | 'cash_on_delivery';

export interface IPayment extends Document {
    order: Types.ObjectId;
    user: Types.ObjectId;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    stripePaymentIntentId?: string;
    stripeClientSecret?: string;
    stripeChargeId?: string;
    refundId?: string;
    refundAmount?: number;
    refundReason?: string;
    failureReason?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        required: true,
        default: 'usd',
        lowercase: true,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'],
        default: 'pending',
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank_transfer', 'cash_on_delivery'],
        required: true,
    },
    stripePaymentIntentId: {
        type: String,
        sparse: true,
    },
    stripeClientSecret: {
        type: String,
        select: false,
    },
    stripeChargeId: {
        type: String,
    },
    refundId: {
        type: String,
    },
    refundAmount: {
        type: Number,
        min: 0,
    },
    refundReason: {
        type: String,
    },
    failureReason: {
        type: String,
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});

paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });

export const Payment = model<IPayment>('Payment', paymentSchema);