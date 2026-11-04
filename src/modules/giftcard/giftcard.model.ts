import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'void';

interface IGiftCardTransaction {
    type: 'purchase' | 'redemption' | 'refund' | 'adjustment';
    amount: number;
    balanceAfter: number;
    order?: Types.ObjectId;
    performedBy?: Types.ObjectId;
    note?: string;
    createdAt: Date;
}

export interface IGiftCard extends Document {
    code: string;
    initialBalance: number;
    currentBalance: number;
    currency: string;
    status: GiftCardStatus;
    purchasedBy?: Types.ObjectId;
    recipientEmail: string;
    recipientName?: string;
    senderName?: string;
    message?: string;
    isGift: boolean;
    deliveryDate?: Date;
    deliveredAt?: Date;
    expiresAt?: Date;
    transactions: IGiftCardTransaction[];
    createdAt: Date;
    updatedAt: Date;
}

const transactionSchema = new Schema<IGiftCardTransaction>({
    type: {
        type: String,
        enum: ['purchase', 'redemption', 'refund', 'adjustment'],
        required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: String,
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const giftCardSchema = new Schema<IGiftCard>({
    code: {
        type: String,
        required: true,
        uppercase: true,
    },
    initialBalance: {
        type: Number,
        required: [true, 'Initial balance is required'],
        min: [1, 'Gift card must have a value of at least 1'],
    },
    currentBalance: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
    },
    status: {
        type: String,
        enum: ['active', 'redeemed', 'expired', 'void'],
        default: 'active',
    },
    purchasedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    recipientEmail: {
        type: String,
        required: [true, 'Recipient email is required'],
        lowercase: true,
        trim: true,
    },
    recipientName: String,
    senderName: String,
    message: {
        type: String,
        maxlength: 300,
    },
    isGift: {
        type: Boolean,
        default: false,
    },
    deliveryDate: Date,
    deliveredAt: Date,
    expiresAt: {
        type: Date,
        index: true,
    },
    transactions: {
        type: [transactionSchema],
        default: [],
    },
}, {
    timestamps: true,
});

giftCardSchema.index({ code: 1 });
giftCardSchema.index({ recipientEmail: 1 });
giftCardSchema.index({ status: 1 });
giftCardSchema.index({ purchasedBy: 1 });

giftCardSchema.pre('save', function() {
    if (this.status === 'active' && this.expiresAt && new Date() > this.expiresAt) {
        this.status = 'expired';
    }
    if (this.status === 'active' && this.currentBalance <= 0) {
        this.status = 'redeemed';
    }
});

export function generateGiftCardCode(): string {
    const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
    return `GC-${segment()}-${segment()}-${segment()}`;
}

export const GiftCard = model<IGiftCard>('GiftCard', giftCardSchema);