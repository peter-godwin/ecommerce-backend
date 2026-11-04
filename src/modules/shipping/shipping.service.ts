import { ShippingZone, IShippingZone } from './shipping-zone.model';
import { ShippingMethod, IShippingMethod } from './shipping-method.model';
import { Shipment, IShipment, ShipmentStatus } from './shipment.model';
import { Order } from '../order/order.model';
import mongoose from 'mongoose';

export interface CalculateShippingDTO {
    country: string;
    state?: string;
    postalCode?: string;
    orderTotal: number;
    weight?: number;
}

export interface CreateShipmentDTO {
    orderId: string;
    shippingMethodId: string;
    trackingNumber: string;
    carrier: string;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
}

export class ShippingService {
    static async getAvailableShippingMethods(dto: CalculateShippingDTO): Promise<{
        methods: Array<{
            _id: string;
            name: string;
            description?: string;
            speed: string;
            rate: number;
            estimatedDays: { min: number; max: number };
            estimatedDelivery: { min: Date; max: Date };
        }>;
    }> {
        const zone = await this.findZoneForLocation(dto.country, dto.state, dto.postalCode);

        if (!zone) {
            throw new Error('No shipping available for this location');
        }

        const methods = await ShippingMethod.find({
            zone: zone._id,
            isActive: true,
        }).sort({ 'estimatedDays.min': 1 });

        const methodsWithRates = methods.map(method => {
            const rate = this.calculateRate(method, dto.orderTotal, dto.weight);
            const estimatedDelivery = this.calculateDeliveryDates(method.estimatedDays);

            return {
                _id: method._id.toString(),
                name: method.name,
                description: method.description,
                speed: method.speed,
                rate,
                estimatedDays: method.estimatedDays,
                estimatedDelivery,
            };
        });

        return { methods: methodsWithRates };
    }

    private static calculateRate(
        method: IShippingMethod,
        orderTotal: number,
        weight?: number
    ): number {
        if (method.freeShippingThreshold && orderTotal >= method.freeShippingThreshold) {
            return 0;
        }

        switch (method.rateType) {
            case 'flat':
                return method.flatRate || 0;

            case 'weight_based': {
                if (!weight || !method.weightRates) {
                    throw new Error('Weight is required for weight-based shipping');
                }
                const weightRate = method.weightRates.find(
                    r => weight >= r.minWeight && weight <= r.maxWeight
                );
                return weightRate?.rate || 0;
            }

            case 'price_based': {
                if (!method.priceRates) {
                    return 0;
                }
                const priceRate = method.priceRates.find(
                    r => orderTotal >= r.minPrice && orderTotal <= r.maxPrice
                );
                return priceRate?.rate || 0;
            }

            default:
                return 0;
        }
    }

    private static async findZoneForLocation(
        country: string,
        state?: string,
        postalCode?: string
    ): Promise<IShippingZone | null> {
        const query: Record<string, unknown> = { isActive: true, countries: country.toUpperCase() };

        if (state) {
            query.$or = [
                { states: { $size: 0 } }, // No state restrictions
                { states: state.toUpperCase() },
            ];
        }

        if (postalCode) {
            query.$or = [
                ...(query.$or as unknown[]),
                { postalCodes: { $size: 0 } },
                { postalCodes: postalCode },
            ];
        }

        return await ShippingZone.findOne(query);
    }

    private static calculateDeliveryDates(estimatedDays: { min: number; max: number }): {
        min: Date;
        max: Date;
    } {
        const now = new Date();
        const minDate = new Date(now);
        const maxDate = new Date(now);

        minDate.setDate(minDate.getDate() + estimatedDays.min);
        maxDate.setDate(maxDate.getDate() + estimatedDays.max);

        return { min: minDate, max: maxDate };
    }

    static async createShipment(dto: CreateShipmentDTO): Promise<IShipment> {
        if (!mongoose.Types.ObjectId.isValid(dto.orderId)) {
            throw new Error('Invalid order ID');
        }

        if (!mongoose.Types.ObjectId.isValid(dto.shippingMethodId)) {
            throw new Error('Invalid shipping method ID');
        }

        const order = await Order.findById(dto.orderId).populate('user');
        if (!order) {
            throw new Error('Order not found');
        }

        const method = await ShippingMethod.findById(dto.shippingMethodId);
        if (!method) {
            throw new Error('Shipping method not found');
        }

        const orderTotal = order.finalPrice;
        const shippingCost = this.calculateRate(method, orderTotal, dto.weight);

        const addressParts = order.shippingAddress.split(',').map(s => s.trim());

        const deliveryDates = this.calculateDeliveryDates(method.estimatedDays);

        const shipment = await Shipment.create({
            order: order._id,
            trackingNumber: dto.trackingNumber,
            carrier: dto.carrier,
            shippingMethod: method._id,
            status: 'label_created',
            estimatedDelivery: deliveryDates.max,
            shippingCost,
            weight: dto.weight,
            dimensions: dto.dimensions,
            shippingAddress: {
                fullName: (order.user as unknown as { name: string }).name,
                addressLine1: addressParts[0] || '',
                city: addressParts[1] || '',
                state: addressParts[2] || '',
                postalCode: addressParts[3] || '',
                country: addressParts[4] || 'US',
            },
            trackingEvents: [{
                status: 'label_created',
                description: 'Shipping label created',
                timestamp: new Date(),
            }],
        });

        await Order.findByIdAndUpdate(order._id, {
            trackingNumber: dto.trackingNumber,
            status: 'shipped',
        });

        return shipment;
    }

    static async getShipmentByTracking(trackingNumber: string): Promise<IShipment | null> {
        return await Shipment.findOne({ trackingNumber })
            .populate('order')
            .populate('shippingMethod');
    }

    static async getShipmentByOrder(orderId: string): Promise<IShipment | null> {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error('Invalid order ID');
        }

        return await Shipment.findOne({ order: orderId })
            .populate('shippingMethod');
    }

    static async updateShipmentStatus(
        trackingNumber: string,
        status: ShipmentStatus,
        location?: string,
        description?: string
    ): Promise<IShipment | null> {
        const shipment = await Shipment.findOne({ trackingNumber });
        if (!shipment) {
            throw new Error('Shipment not found');
        }

        shipment.status = status;

        shipment.trackingEvents.push({
            status,
            location,
            description: description || `Status updated to ${status}`,
            timestamp: new Date(),
        });

        if (status === 'delivered') {
            shipment.actualDelivery = new Date();

            await Order.findByIdAndUpdate(shipment.order, {
                status: 'delivered',
            });
        }

        await shipment.save();

        return shipment;
    }

    static async getAllShipments(filters?: {
        status?: ShipmentStatus;
        page?: number;
        limit?: number;
    }): Promise<{
        shipments: IShipment[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        const page = Math.max(1, filters?.page || 1);
        const limit = Math.min(50, Math.max(1, filters?.limit || 20));
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = {};

        if (filters?.status) {
            query.status = filters.status;
        }

        const [shipments, total] = await Promise.all([
            Shipment.find(query)
                .populate('order')
                .populate('shippingMethod')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Shipment.countDocuments(query),
        ]);

        return {
            shipments: shipments as IShipment[],
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    static async createZone(data: Partial<IShippingZone>): Promise<IShippingZone> {
        return await ShippingZone.create(data);
    }

    static async getZones(): Promise<IShippingZone[]> {
        return await ShippingZone.find({ isActive: true });
    }

    static async updateZone(zoneId: string, data: Partial<IShippingZone>): Promise<IShippingZone | null> {
        return await ShippingZone.findByIdAndUpdate(zoneId, data, { new: true });
    }

    static async deleteZone(zoneId: string): Promise<void> {
        await ShippingZone.findByIdAndDelete(zoneId);
    }

    static async createMethod(data: Partial<IShippingMethod>): Promise<IShippingMethod> {
        return await ShippingMethod.create(data);
    }

    static async getMethods(zoneId?: string): Promise<IShippingMethod[]> {
        const query: Record<string, unknown> = { isActive: true };
        if (zoneId) {
            query.zone = zoneId;
        }
        return await ShippingMethod.find(query).populate('zone');
    }

    static async updateMethod(methodId: string, data: Partial<IShippingMethod>): Promise<IShippingMethod | null> {
        return await ShippingMethod.findByIdAndUpdate(methodId, data, { new: true });
    }

    static async deleteMethod(methodId: string): Promise<void> {
        await ShippingMethod.findByIdAndDelete(methodId);
    }
}