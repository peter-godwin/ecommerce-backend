import { Schema, model, Document, Types } from 'mongoose';

interface IOrderItem {
    product: Types.ObjectId;
    quantity: number;
    price: number;
    name: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface IOrder extends Document {
    user: Types.ObjectId;
    items: IOrderItem[];
    totalPrice: number;
    discount: number;
    finalPrice: number;
    appliedCoupon?: {
        code: string;
        discountAmount: number;
    };
    giftCardApplied?: {
        code: string;
        amountApplied: number;
    };
    shippingAddress: string;
    status: OrderStatus;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod?: string;
    trackingNumber?: string;
    notes?: string;
    cancelledAt?: Date;
    deliveredAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    name: { type: String, required: true },
});

const orderSchema = new Schema<IOrder>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
        type: [orderItemSchema],
        validate: {
            validator: (items: IOrderItem[]) => items.length > 0,
            message: 'Order must have at least one item'
        }
    },
    totalPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, required: true, min: 0 },
    appliedCoupon: {
        code: { type: String, uppercase: true },
        discountAmount: { type: Number, min: 0 },
    },
    giftCardApplied: {
        code: { type: String, uppercase: true },
        amountApplied: { type: Number, min: 0 },
    },
    shippingAddress: { type: String, required: true, minlength: 10 },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
    },
    paymentMethod: { type: String },
    trackingNumber: { type: String },
    notes: { type: String },
    cancelledAt: { type: Date },
    deliveredAt: { type: Date },
}, {
    timestamps: true,
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.product': 1 });

export const Order = model<IOrder>('Order', orderSchema);