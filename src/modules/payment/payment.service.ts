import { Payment, IPayment, PaymentStatus } from './payment.model';
import { Order } from '../order/order.model';
import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import { CreatePaymentIntentDTO, RefundPaymentDTO } from './payment.dto';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../../utils/email';
import mongoose from 'mongoose';
import { NotificationService } from '../notification/notification.service';
import { User } from '../user/user.model';

export class PaymentService {
    static async createPaymentIntent(userId: string, dto: CreatePaymentIntentDTO): Promise<IPayment> {
        if (!mongoose.Types.ObjectId.isValid(dto.orderId)) {
            throw new Error('Invalid order ID');
        }

        const order = await Order.findById(dto.orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.user.toString() !== userId) {
            throw new Error('Unauthorized access to order');
        }

        const existingPayment = await Payment.findOne({ order: dto.orderId });
        if (existingPayment && existingPayment.status === 'succeeded') {
            throw new Error('Order has already been paid');
        }

        const amountInCents = Math.round(dto.amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: dto.currency || env.stripe.currency,
            metadata: {
                orderId: dto.orderId,
                userId: userId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
            //return_url - this will be provided during confirmation on frontend
        });

        let payment: IPayment;
        if (existingPayment) {
            existingPayment.stripePaymentIntentId = paymentIntent.id;
            existingPayment.stripeClientSecret = paymentIntent.client_secret || undefined;
            existingPayment.amount = dto.amount;
            existingPayment.status = 'pending';
            payment = await existingPayment.save();
        } else {
            payment = await Payment.create({
                order: dto.orderId,
                user: userId,
                amount: dto.amount,
                currency: dto.currency || env.stripe.currency,
                status: 'pending',
                paymentMethod: dto.paymentMethod || 'card',
                stripePaymentIntentId: paymentIntent.id,
                stripeClientSecret: paymentIntent.client_secret || '',
            });
        }

        return payment;
    }

    static async getPaymentById(paymentId: string): Promise<IPayment | null> {
        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            throw new Error('Invalid payment ID');
        }

        return await Payment.findById(paymentId)
            .populate('order')
            .populate('user', 'name email');
    }

    static async getPaymentByOrderId(orderId: string): Promise<IPayment | null> {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error('Invalid order ID');
        }

        return await Payment.findOne({ order: orderId })
            .populate('order')
            .populate('user', 'name email');
    }

    static async getUserPayments(userId: string): Promise<IPayment[]> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        return await Payment.find({ user: userId })
            .populate('order')
            .sort({ createdAt: -1 });
    }

    static async updatePaymentStatus(
        paymentIntentId: string,
        status: PaymentStatus,
        chargeId?: string
    ): Promise<IPayment | null> {
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId })
            .populate('user', 'name email');

        if (!payment) {
            throw new Error('Payment not found');
        }

        payment.status = status;
        if (chargeId) {
            payment.stripeChargeId = chargeId;
        }

        if (status === 'succeeded') {
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'paid',
                status: 'processing',
            });

            try {
                const user = payment.user as unknown as { email: string; name: string; _id: { toString(): string } };
                await sendPaymentSuccessEmail(user.email, {
                    orderId: payment.order.toString(),
                    orderNumber: payment.order.toString().slice(-8).toUpperCase(),
                    customerName: user.name,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    transactionId: chargeId || paymentIntentId,
                    paidAt: new Date(),
                });
                console.log(`✅ Payment success email sent to ${user.email}`);

                await NotificationService.sendNotification({
                    userId: user._id.toString(),
                    type: 'payment_success',
                    title: 'Payment Successful!',
                    message: `Your payment of $${payment.amount.toFixed(2)} has been processed successfully.`,
                    priority: 'high',
                    relatedOrder: payment.order.toString(),
                    actionUrl: `/orders/${payment.order}`,
                    userEmail: user.email,
                });
            } catch (emailError) {
                console.error('❌ Failed to send payment success email:', emailError);
            }
        } else if (status === 'failed') {
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'failed',
            });
        }

        return await payment.save();
    }

    static async handlePaymentFailure(
        paymentIntentId: string,
        failureReason: string
    ): Promise<IPayment | null> {
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId })
            .populate('user', 'name email');

        if (!payment) {
            return null;
        }

        payment.status = 'failed';
        payment.failureReason = failureReason;

        await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: 'failed',
        });

        try {
            const user = payment.user as unknown as { email: string; name: string; _id: { toString(): string } };
            await sendPaymentFailedEmail(user.email, {
                orderId: payment.order.toString(),
                orderNumber: payment.order.toString().slice(-8).toUpperCase(),
                customerName: user.name,
                amount: payment.amount,
                reason: failureReason,
            });
            console.log(`✅ Payment failed email sent to ${user.email}`);

            await NotificationService.sendNotification({
                userId: user._id.toString(),
                type: 'payment_failed',
                title: 'Payment Failed',
                message: `Your payment of $${payment.amount.toFixed(2)} could not be processed. ${failureReason}`,
                priority: 'urgent',
                relatedOrder: payment.order.toString(),
                actionUrl: `/orders/${payment.order}`,
                userEmail: user.email,
            });
        } catch (emailError) {
            console.error('❌ Failed to send payment failed email:', emailError);
        }

        return await payment.save();
    }

    static async refundPayment(dto: RefundPaymentDTO): Promise<IPayment> {
        if (!mongoose.Types.ObjectId.isValid(dto.paymentId)) {
            throw new Error('Invalid payment ID');
        }

        const payment = await Payment.findById(dto.paymentId).populate('user', 'name email');
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== 'succeeded') {
            throw new Error('Can only refund successful payments');
        }

        if (!payment.stripeChargeId) {
            throw new Error('No charge ID found for this payment');
        }

        const refundAmount = dto.amount
            ? Math.round(dto.amount * 100)
            : Math.round(payment.amount * 100);

        const refund = await stripe.refunds.create({
            charge: payment.stripeChargeId,
            amount: refundAmount,
            reason: dto.reason === 'duplicate' ? 'duplicate' :
                dto.reason === 'fraudulent' ? 'fraudulent' :
                    'requested_by_customer',
        });

        payment.status = 'refunded';
        payment.refundId = refund.id;
        payment.refundAmount = refundAmount / 100;
        payment.refundReason = dto.reason;

        await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: 'refunded',
        });

        return await payment.save();
    }

    static getPublishableKey(): string {
        return env.stripe.publishableKey;
    }

    static async getPaymentStats(): Promise<Record<string, unknown>> {
        const stats = await Payment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                },
            },
        ]);

        const totalRevenue = await Payment.aggregate([
            { $match: { status: 'succeeded' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        return {
            byStatus: stats,
            totalRevenue: totalRevenue[0]?.total || 0,
        };
    }

    static async createSetupIntent(userId: string): Promise<{ clientSecret: string; customerId?: string }> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId },
            });
            customerId = customer.id;
            await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            usage: 'off_session',
            metadata: { userId },
        });

        return { clientSecret: setupIntent.client_secret ?? '', customerId };
    }

    static async savePaymentMethod(userId: string, paymentMethodId: string): Promise<unknown> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId },
            });
            customerId = customer.id;
            await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
        }

        const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        return paymentMethod;
    }

    static async getSavedPaymentMethods(userId: string): Promise<unknown[]> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const user = await User.findById(userId);
        if (!user?.stripeCustomerId) {
            return [];
        }

        const paymentMethods = await stripe.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: 'card',
        });

        return paymentMethods.data;
    }
}
