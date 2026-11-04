import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { PaymentService } from './payment.service';
import { validateCreatePaymentIntent } from './payment.dto';
import { stripe } from '../../config/stripe';
import { env } from '../../config/env';

export const createPaymentIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateCreatePaymentIntent(req.body);
    const payment = await PaymentService.createPaymentIntent(req.user._id.toString(), dto);

    res.status(201).json({
        success: true,
        message: 'Payment intent created',
        payment: {
            id: payment._id,
            orderId: payment.order,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            clientSecret: payment.stripeClientSecret,
            paymentMethod: payment.paymentMethod,
        },
    });
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid payment ID' });
        return;
    }
    const payment = await PaymentService.getPaymentById(id);

    if (!payment) {
        res.status(404).json({ success: false, message: 'Payment not found' });
        return;
    }

    if (payment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
    }

    res.status(200).json({ success: true, payment });
});

export const getPaymentByOrderId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { orderId } = req.params;
    if (typeof orderId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid order ID' });
        return;
    }
    const payment = await PaymentService.getPaymentByOrderId(orderId);

    if (!payment) {
        res.status(404).json({ success: false, message: 'Payment not found' });
        return;
    }

    if (payment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
    }

    res.status(200).json({ success: true, payment });
});

export const getUserPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const payments = await PaymentService.getUserPayments(req.user._id.toString());
    res.status(200).json({ success: true, count: payments.length, payments });
});

export const refundPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid payment ID' });
        return;
    }
    const { amount, reason } = req.body;

    const payment = await PaymentService.refundPayment({
        paymentId: id,
        amount,
        reason,
    });

    res.status(200).json({
        success: true,
        message: 'Payment refunded successfully',
        payment,
    });
});

export const createSetupIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const userId = req.user._id.toString();
    const { clientSecret, customerId } = await PaymentService.createSetupIntent(userId);

    res.status(200).json({ success: true, clientSecret, customerId });
});

export const savePaymentMethod = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { paymentMethodId } = req.body as { paymentMethodId?: string };
    if (!paymentMethodId) {
        res.status(400).json({ success: false, message: 'paymentMethodId is required' });
        return;
    }

    const paymentMethod = await PaymentService.savePaymentMethod(req.user._id.toString(), paymentMethodId);
    res.status(200).json({ success: true, paymentMethod });
});

export const getSavedPaymentMethods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const paymentMethods = await PaymentService.getSavedPaymentMethods(req.user._id.toString());
    res.status(200).json({ success: true, paymentMethods });
});

export const getPublishableKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const publishableKey = PaymentService.getPublishableKey();
    res.status(200).json({ success: true, publishableKey });
});

export const getPaymentStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await PaymentService.getPaymentStats();
    res.status(200).json({ success: true, stats });
});

export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        res.status(400).json({ success: false, message: 'Missing stripe signature' });
        return;
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            env.stripe.webhookSecret
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Webhook signature verification failed:', message);
        res.status(400).json({ success: false, message: `Webhook Error: ${message}` });
        return;
    }

    switch (event.type) {
        case 'payment_intent.succeeded':
            { const paymentIntent = event.data.object as unknown as { id: string; charges?: { data: { id: string }[] } };
            await PaymentService.updatePaymentStatus(
                paymentIntent.id,
                'succeeded',
                paymentIntent.charges?.data[0]?.id
            );
            console.log('Payment succeeded:', paymentIntent.id);
            break; }

        case 'payment_intent.payment_failed':
            { const failedIntent = event.data.object as unknown as { id: string; last_payment_error?: { message?: string } };
            await PaymentService.handlePaymentFailure(
                failedIntent.id,
                failedIntent.last_payment_error?.message || 'Payment failed'
            );
            console.log('Payment failed:', failedIntent.id);
            break; }

        case 'payment_intent.canceled':
        {const canceledIntent = event.data.object as unknown as { id: string };
            await PaymentService.updatePaymentStatus(canceledIntent.id, 'canceled');
            console.log('Payment canceled:', canceledIntent.id);
            break;
            }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ success: true, received: true });
});

export const devUpdatePaymentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!env.devEndpointsEnabled) {
        res.status(403).json({
            success: false,
            message: 'This endpoint is not available in this environment',
        });
        return;
    }

    const { paymentIntentId } = req.params;
    if (typeof paymentIntentId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid payment intent ID' });
        return;
    }
    const { status } = req.body;

    if (!status) {
        res.status(400).json({ success: false, message: 'Status is required' });
        return;
    }

    const validStatuses = ['succeeded', 'failed', 'canceled'];
    if (!validStatuses.includes(status)) {
        res.status(400).json({
            success: false,
            message: `Status must be one of: ${validStatuses.join(', ')}`
        });
        return;
    }

    let payment;

    try {
        if (status === 'succeeded') {
            payment = await PaymentService.updatePaymentStatus(
                paymentIntentId,
                'succeeded',
                'ch_dev_manual'
            );
        } else if (status === 'failed') {
            payment = await PaymentService.handlePaymentFailure(
                paymentIntentId,
                'Manual development test failure'
            );
        } else if (status === 'canceled') {
            payment = await PaymentService.updatePaymentStatus(paymentIntentId, 'canceled');
        }

        res.status(200).json({
            success: true,
            message: `Payment status updated to ${status}`,
            payment
        });
    } catch (error: unknown) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update payment status'
        });
    }
});