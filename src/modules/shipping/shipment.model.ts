import { Schema, model, Document, Types } from 'mongoose';

export type ShipmentStatus =
    | 'pending'
    | 'label_created'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'failed'
    | 'returned';

export interface IShipment extends Document {
    order: Types.ObjectId;
    trackingNumber: string;
    carrier: string;
    shippingMethod: Types.ObjectId;
    status: ShipmentStatus;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    shippingCost: number;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    shippingAddress: {
        fullName: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        phone?: string;
    };
    trackingEvents: {
        status: ShipmentStatus;
        location?: string;
        description: string;
        timestamp: Date;
    }[];
    labelUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const shipmentSchema = new Schema<IShipment>({
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    trackingNumber: {
        type: String,
        required: [true, 'Tracking number is required'],
    },
    carrier: {
        type: String,
        required: [true, 'Carrier is required'],
        trim: true,
    },
    shippingMethod: {
        type: Schema.Types.ObjectId,
        ref: 'ShippingMethod',
        required: true,
    },
    status: {
        type: String,
        enum: [
            'pending',
            'label_created',
            'picked_up',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'failed',
            'returned'
        ],
        default: 'pending',
    },
    estimatedDelivery: {
        type: Date,
    },
    actualDelivery: {
        type: Date,
    },
    shippingCost: {
        type: Number,
        required: true,
        min: 0,
    },
    weight: {
        type: Number,
        min: 0,
    },
    dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
    },
    shippingAddress: {
        fullName: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: String,
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        phone: String,
    },
    trackingEvents: [{
        status: {
            type: String,
            enum: [
                'pending',
                'label_created',
                'picked_up',
                'in_transit',
                'out_for_delivery',
                'delivered',
                'failed',
                'returned'
            ],
            required: true,
        },
        location: String,
        description: { type: String, required: true },
        timestamp: { type: Date, required: true, default: Date.now },
    }],
    labelUrl: {
        type: String,
    },
}, {
    timestamps: true,
});

shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ order: 1 });
shipmentSchema.index({ status: 1 });

export const Shipment = model<IShipment>('Shipment', shipmentSchema);