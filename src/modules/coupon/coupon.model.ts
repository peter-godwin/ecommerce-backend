import { Schema, model, Document, Types } from 'mongoose';

export type DiscountType = 'percentage' | 'fixed' | 'free_shipping';
export type CouponStatus = 'active' | 'inactive' | 'expired';

export interface ICoupon extends Document {
    code: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderValue?: number;
    maxDiscount?: number;
    maxUses?: number;
    maxUsesPerUser?: number;
    usedCount: number;
    usedBy: {
        user: Types.ObjectId;
        usedAt: Date;
        orderValue: number;
        discountAmount: number;
    }[];
    validFrom: Date;
    validUntil: Date;
    status: CouponStatus;
    isPublic: boolean;
    applicableProducts?: Types.ObjectId[];
    applicableCategories?: string[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        uppercase: true,
        trim: true,
        minlength: [3, 'Code must be at least 3 characters'],
        maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed', 'free_shipping'],
        required: true,
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative'],
    },
    minOrderValue: {
        type: Number,
        min: [0, 'Minimum order value cannot be negative'],
    },
    maxDiscount: {
        type: Number,
        min: [0, 'Maximum discount cannot be negative'],
    },
    maxUses: {
        type: Number,
        min: [1, 'Maximum uses must be at least 1'],
    },
    maxUsesPerUser: {
        type: Number,
        default: 1,
        min: [1, 'Maximum uses per user must be at least 1'],
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    usedBy: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        usedAt: {
            type: Date,
            default: Date.now,
        },
        orderValue: {
            type: Number,
            required: true,
        },
        discountAmount: {
            type: Number,
            required: true,
        },
    }],
    validFrom: {
        type: Date,
        required: [true, 'Valid from date is required'],
    },
    validUntil: {
        type: Date,
        required: [true, 'Valid until date is required'],
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active',
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    applicableProducts: [{
        type: Schema.Types.ObjectId,
        ref: 'Product',
    }],
    applicableCategories: [{
        type: String,
        lowercase: true,
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

couponSchema.index({ code: 1 });
couponSchema.index({ status: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1 });


couponSchema.pre('save', async function() {
    if (this.discountType === 'percentage' && this.discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
    }

    if (this.validFrom >= this.validUntil) {
        throw new Error('Valid until date must be after valid from date');
    }

    const now = new Date();

    if (this.status === 'active') {
        if (now < this.validFrom) {
            this.status = 'inactive';
        } else if (now > this.validUntil) {
            this.status = 'expired';
        } else if (this.maxUses && this.usedCount >= this.maxUses) {
            this.status = 'expired';
        }
    }
});

export const Coupon = model<ICoupon>('Coupon', couponSchema);