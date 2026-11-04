import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { OrderService } from './order.service';
import { validateCreateOrder, validateUpdateStatus } from './order.dto';

export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateCreateOrder(req.body);

    const order = await OrderService.createOrder(req.user, dto);

    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order
    });
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const orders = await OrderService.getMyOrders(req.user._id.toString());

    res.status(200).json({
        success: true,
        count: orders.length,
        orders
    });
});

export const getOrderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid order ID' });
        return;
    }

    const order = await OrderService.getOrderById(id);

    if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
    }

    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
    }

    res.status(200).json({ success: true, order });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid order ID' });
        return;
    }

    const dto = validateUpdateStatus(req.body);

    const order = await OrderService.updateOrderStatus(id, dto);

    if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Order status updated',
        order
    });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid order ID' });
        return;
    }

    const order = await OrderService.cancelOrder(
        id,
        req.user._id.toString(),
        req.user.role === 'admin'
    );

    res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        order
    });
});

export const getOrderStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await OrderService.getOrderStats();

    res.status(200).json({
        success: true,
        stats
    });
});