import { Schema, model, Document } from 'mongoose';

export interface IShippingZone extends Document {
    name: string;
    countries: string[];
    states?: string[];
    postalCodes?: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const shippingZoneSchema = new Schema<IShippingZone>({
    name: {
        type: String,
        required: [true, 'Zone name is required'],
        trim: true,
        maxlength: 100,
    },
    countries: {
        type: [String],
        required: [true, 'At least one country is required'],
        validate: {
            validator: (countries: string[]) => countries.length > 0,
            message: 'At least one country is required'
        }
    },
    states: {
        type: [String],
        default: [],
    },
    postalCodes: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

shippingZoneSchema.index({ countries: 1 });
shippingZoneSchema.index({ isActive: 1 });

export const ShippingZone = model<IShippingZone>('ShippingZone', shippingZoneSchema);