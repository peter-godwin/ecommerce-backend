import { Schema, model, Document, Types } from 'mongoose';

interface ICartItem {
    _id: Types.ObjectId;
    product: Types.ObjectId;
    quantity: number;
}

export interface ICart extends Document {
    user: Types.ObjectId;
    items: ICartItem[];
    appliedCoupon?: {
        code: string;
        discount: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, max: 100 },
});

const cartSchema = new Schema<ICart>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
        type: [cartItemSchema],
        default: [],
        validate: {
            validator: (items: ICartItem[]) => items.length <= 50,
            message: 'Maximum 50 different items allowed in cart'
        }
    },
    appliedCoupon: {
        code: { type: String, uppercase: true },
        discount: { type: Number, min: 0 },
    },
}, {
    timestamps: true,
});

cartSchema.index({ user: 1 });
cartSchema.index({ 'items.product': 1 });

export const Cart = model<ICart>('Cart', cartSchema);