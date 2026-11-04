import { Schema, model, Document, Types, SaveOptions } from 'mongoose';

export type RateType = 'flat' | 'weight_based' | 'price_based';
export type ShippingSpeed = 'standard' | 'express' | 'overnight' | 'economy';

export interface IShippingMethod extends Document {
    name: string;
    description?: string;
    zone: Types.ObjectId;
    speed: ShippingSpeed;
    rateType: RateType;
    flatRate?: number;
    weightRates?: {
        minWeight: number;
        maxWeight: number;
        rate: number;
    }[];
    priceRates?: {
        minPrice: number;
        maxPrice: number;
        rate: number;
    }[];
    freeShippingThreshold?: number;
    estimatedDays: {
        min: number;
        max: number;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const shippingMethodSchema = new Schema<IShippingMethod>({
    name: {
        type: String,
        required: [true, 'Method name is required'],
        trim: true,
        maxlength: 100,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    zone: {
        type: Schema.Types.ObjectId,
        ref: 'ShippingZone',
        required: [true, 'Shipping zone is required'],
        index: true,
    },
    speed: {
        type: String,
        enum: ['standard', 'express', 'overnight', 'economy'],
        required: true,
    },
    rateType: {
        type: String,
        enum: ['flat', 'weight_based', 'price_based'],
        required: true,
    },
    flatRate: {
        type: Number,
        min: 0,
    },
    weightRates: [{
        minWeight: { type: Number, required: true, min: 0 },
        maxWeight: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
    }],
    priceRates: [{
        minPrice: { type: Number, required: true, min: 0 },
        maxPrice: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
    }],
    freeShippingThreshold: {
        type: Number,
        min: 0,
    },
    estimatedDays: {
        min: { type: Number, required: true, min: 0 },
        max: { type: Number, required: true, min: 0 },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

shippingMethodSchema.index({ zone: 1, isActive: 1 });
shippingMethodSchema.index({ speed: 1 });

shippingMethodSchema.pre('save', function(next: unknown) {
    const hookNext = next as (err?: Error) => void;
    if (this.rateType === 'flat' && !this.flatRate) {
        hookNext(new Error('Flat rate is required for flat rate type'));
    }

    if (this.rateType === 'weight_based' && (!this.weightRates || this.weightRates.length === 0)) {
        hookNext(new Error('Weight rates are required for weight-based type'));
    }

    if (this.rateType === 'price_based' && (!this.priceRates || this.priceRates.length === 0)) {
        hookNext(new Error('Price rates are required for price-based type'));
    }

    if (this.estimatedDays.min > this.estimatedDays.max) {
        hookNext(new Error('Min estimated days cannot be greater than max'));
    }

    hookNext();
});

export const ShippingMethod = model<IShippingMethod>('ShippingMethod', shippingMethodSchema);