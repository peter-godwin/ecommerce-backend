import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ShippingService } from './shipping.service';
import { ShipmentStatus } from './shipment.model';

export const calculateShipping = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { country, state, postalCode, orderTotal, weight } = req.body;

    if (!country || !orderTotal) {
        res.status(400).json({
            success: false,
            message: 'Country and order total are required'
        });
        return;
    }

    const result = await ShippingService.getAvailableShippingMethods({
        country,
        state,
        postalCode,
        orderTotal: Number(orderTotal),
        weight: weight ? Number(weight) : undefined,
    });

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const createShipment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { orderId, shippingMethodId, trackingNumber, carrier, weight, dimensions } = req.body;

    if (!orderId || !shippingMethodId || !trackingNumber || !carrier) {
        res.status(400).json({
            success: false,
            message: 'Order ID, shipping method, tracking number, and carrier are required'
        });
        return;
    }

    const shipment = await ShippingService.createShipment({
        orderId,
        shippingMethodId,
        trackingNumber,
        carrier,
        weight: weight ? Number(weight) : undefined,
        dimensions,
    });

    res.status(201).json({
        success: true,
        message: 'Shipment created successfully',
        shipment,
    });
});

export const getShipmentByTracking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { trackingNumber } = req.params;
    if (typeof trackingNumber !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid tracking number' });
        return;
    }

    const shipment = await ShippingService.getShipmentByTracking(trackingNumber);

    if (!shipment) {
        res.status(404).json({ success: false, message: 'Shipment not found' });
        return;
    }

    res.status(200).json({
        success: true,
        shipment,
    });
});

export const getShipmentByOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { orderId } = req.params;
    if (typeof orderId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid order ID' });
        return;
    }

    const shipment = await ShippingService.getShipmentByOrder(orderId);

    if (!shipment) {
        res.status(404).json({ success: false, message: 'Shipment not found for this order' });
        return;
    }

    res.status(200).json({
        success: true,
        shipment,
    });
});

export const updateShipmentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { trackingNumber } = req.params;
    if (typeof trackingNumber !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid tracking number' });
        return;
    }
    const { status, location, description } = req.body;

    if (!status) {
        res.status(400).json({ success: false, message: 'Status is required' });
        return;
    }

    const shipment = await ShippingService.updateShipmentStatus(
        trackingNumber,
        status,
        location,
        description
    );

    res.status(200).json({
        success: true,
        message: 'Shipment status updated',
        shipment,
    });
});

export const getAllShipments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = {
        status: req.query.status as ShipmentStatus,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await ShippingService.getAllShipments(filters);

    res.status(200).json({
        success: true,
        ...result,
    });
});


export const createZone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const zone = await ShippingService.createZone(req.body);

    res.status(201).json({
        success: true,
        message: 'Shipping zone created successfully',
        zone,
    });
});

export const getZones = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const zones = await ShippingService.getZones();

    res.status(200).json({
        success: true,
        count: zones.length,
        zones,
    });
});

export const updateZone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid zone ID' });
        return;
    }
    const zone = await ShippingService.updateZone(id, req.body);

    if (!zone) {
        res.status(404).json({ success: false, message: 'Zone not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Zone updated successfully',
        zone,
    });
});

export const deleteZone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid zone ID' });
        return;
    }
    await ShippingService.deleteZone(id);

    res.status(200).json({
        success: true,
        message: 'Zone deleted successfully',
    });
});


export const createMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const method = await ShippingService.createMethod(req.body);

    res.status(201).json({
        success: true,
        message: 'Shipping method created successfully',
        method,
    });
});

export const getMethods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const zoneId = req.query.zoneId as string;
    const methods = await ShippingService.getMethods(zoneId);

    res.status(200).json({
        success: true,
        count: methods.length,
        methods,
    });
});

export const updateMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid method ID' });
        return;
    }
    const method = await ShippingService.updateMethod(id, req.body);

    if (!method) {
        res.status(404).json({ success: false, message: 'Method not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Method updated successfully',
        method,
    });
});

export const deleteMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid method ID' });
        return;
    }
    await ShippingService.deleteMethod(id);

    res.status(200).json({
        success: true,
        message: 'Method deleted successfully',
    });
});