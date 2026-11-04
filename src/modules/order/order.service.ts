import { Order, IOrder, OrderStatus } from './order.model';
import { CreateOrderDTO, UpdateOrderStatusDTO } from './order.dto';
import { IUser } from '../user/user.model';
import { Product } from '../product/product.model';
import { CartService } from '../cart/cart.service';
import { TransactionHelper } from '../../utils/transaction';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '../../utils/email';
import mongoose from 'mongoose';
import { CouponService } from "../coupon/coupon.service";
import { Cart } from "../cart/cart.model";
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.model';
import { GiftCardService } from '../giftcard/giftcard.service';

export class OrderService {
    private static readonly MAX_ORDER_ITEMS = 50;

    static async createOrder(user: IUser, dto: CreateOrderDTO): Promise<IOrder> {
        if (!mongoose.Types.ObjectId.isValid(user._id.toString())) {
            throw new Error('Invalid user ID');
        }

        if (dto.items.length > this.MAX_ORDER_ITEMS) {
            throw new Error(`Maximum ${this.MAX_ORDER_ITEMS} items per order`);
        }

        let giftCardApplied: { code: string; amountApplied: number } | undefined;

        try {
            return await TransactionHelper.withTransaction(async (session) => {
                const cart = await Cart.findOne({ user: user._id });

                const productIds = dto.items.map(item => item.productId);
                const query = Product.find({ _id: { $in: productIds } });
                const products = session ? await query.session(session) : await query;

                if (products.length !== dto.items.length) {
                    throw new Error('One or more products not found');
                }

                const orderItems = [];
                let totalPrice = 0;

                for (const item of dto.items) {
                    const product = products.find(p => p._id.toString() === item.productId);

                    if (!product) {
                        throw new Error(`Product ${item.productId} not found`);
                    }

                    if (product.stock < item.quantity) {
                        throw new Error(
                            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
                        );
                    }

                    const itemPrice = product.price * item.quantity;
                    totalPrice += itemPrice;

                    orderItems.push({
                        product: product._id,
                        quantity: item.quantity,
                        price: product.price,
                        name: product.name,
                    });

                    product.stock -= item.quantity;
                    if (session) {
                        await product.save({ session });
                    } else {
                        await product.save();
                    }
                }

                let discount = 0;
                let appliedCoupon;

                if (cart?.appliedCoupon && cart.appliedCoupon.code) {
                    discount = cart.appliedCoupon.discount || 0;
                    appliedCoupon = {
                        code: cart.appliedCoupon.code,
                        discountAmount: discount,
                    };

                    await CouponService.recordCouponUsage(
                        cart.appliedCoupon.code,
                        user._id.toString(),
                        totalPrice,
                        discount
                    );
                }

                const finalPrice = Math.max(0, totalPrice - discount);

                let amountDueAfterGiftCard = finalPrice;

                if (dto.giftCardCode) {
                    const { amountApplied } = await GiftCardService.redeemGiftCard(
                        dto.giftCardCode,
                        finalPrice
                    );

                    giftCardApplied = {
                        code: dto.giftCardCode.toUpperCase(),
                        amountApplied,
                    };

                    amountDueAfterGiftCard = Math.max(0, Math.round((finalPrice - amountApplied) * 100) / 100);
                }

                const order = new Order({
                    user: user._id,
                    items: orderItems,
                    totalPrice,
                    discount,
                    finalPrice: amountDueAfterGiftCard,
                    appliedCoupon,
                    giftCardApplied,
                    shippingAddress: dto.shippingAddress,
                    paymentMethod: dto.paymentMethod,
                    notes: dto.notes,
                    status: 'pending',
                    paymentStatus: amountDueAfterGiftCard === 0 && giftCardApplied ? 'paid' : 'pending',
                });

                if (session) {
                    await order.save({ session });
                } else {
                    await order.save();
                }

                await CartService.clearCart(user._id.toString());

                const populatedOrder = await Order.findById(order._id)
                    .populate('items.product')
                    .populate('user', 'name email');

                try {
                    await sendOrderConfirmationEmail(user.email, {
                        orderId: order._id.toString(),
                        orderNumber: order._id.toString().slice(-8).toUpperCase(),
                        customerName: user.name,
                        items: orderItems.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                        totalPrice: amountDueAfterGiftCard,
                        shippingAddress: dto.shippingAddress,
                        createdAt: order.createdAt,
                    });
                    console.log(`Order confirmation email sent to ${user.email}`);
                } catch (emailError) {
                    console.error('Failed to send order confirmation email:', emailError);
                }

                try {
                    await NotificationService.sendNotification({
                        userId: user._id.toString(),
                        type: 'order_placed',
                        title: 'Order Placed Successfully',
                        message: `Your order #${order._id.toString().slice(-8).toUpperCase()} has been placed successfully. Total: $${amountDueAfterGiftCard.toFixed(2)}`,
                        priority: 'high',
                        relatedOrder: order._id.toString(),
                        actionUrl: `/orders/${order._id}`,
                        userEmail: user.email,
                    });
                    console.log(`Order notification sent to ${user.email}`);
                } catch (error) {
                    console.error('Failed to send order notification:', error);
                }

                return populatedOrder as IOrder;
            });
        } catch (error) {
            if (giftCardApplied) {
                try {
                    await GiftCardService.refundToGiftCard(
                        giftCardApplied.code,
                        giftCardApplied.amountApplied
                    );
                    console.log(`Refunded $${giftCardApplied.amountApplied} to gift card ${giftCardApplied.code} after order failure`);
                } catch (refundError) {
                    console.error('Failed to refund gift card after order failure:', refundError);
                }
            }
            throw error;
        }
    }

    static async getMyOrders(userId: string): Promise<IOrder[]> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        return await Order.find({ user: userId })
            .populate('items.product')
            .sort({ createdAt: -1 });
    }

    static async getOrderById(orderId: string): Promise<IOrder | null> {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error('Invalid order ID');
        }

        return await Order.findById(orderId)
            .populate('items.product')
            .populate('user', 'name email');
    }

    static async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDTO): Promise<IOrder | null> {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error('Invalid order ID');
        }

        return await TransactionHelper.withTransaction(async (session) => {
            const query = Order.findById(orderId).populate('items.product').populate('user', 'name email');
            const order = session ? await query.session(session) : await query;

            if (!order) {
                return null;
            }

            const oldStatus = order.status;
            const newStatus = dto.status as OrderStatus;

            this.validateStatusTransition(oldStatus, newStatus);

            if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
                await this.restoreStock(order, session);
                order.cancelledAt = new Date();

                if (order.giftCardApplied && order.giftCardApplied.amountApplied > 0) {
                    try {
                        await GiftCardService.refundToGiftCard(
                            order.giftCardApplied.code,
                            order.giftCardApplied.amountApplied,
                            order._id.toString()
                        );
                        console.log(`Refunded $${order.giftCardApplied.amountApplied} to gift card ${order.giftCardApplied.code}`);
                    } catch (error) {
                        console.error('Failed to refund gift card on cancellation:', error);
                    }
                }
            }

            if (newStatus === 'delivered' && oldStatus !== 'delivered') {
                order.deliveredAt = new Date();
            }

            order.status = newStatus;
            if (dto.trackingNumber) {
                order.trackingNumber = dto.trackingNumber;
            }
            if (dto.notes) {
                order.notes = dto.notes;
            }

            const savedOrder = session ? await order.save({ session }) : await order.save();

            try {
                const user = order.user as unknown as IUser;
                await sendOrderStatusEmail(user.email, {
                    orderId: order._id.toString(),
                    orderNumber: order._id.toString().slice(-8).toUpperCase(),
                    customerName: user.name,
                    status: newStatus,
                    trackingNumber: dto.trackingNumber,
                    updatedAt: new Date(),
                });
                console.log(`Order status email sent to ${user.email} - Status: ${newStatus}`);
            } catch (emailError) {
                console.error('Failed to send order status email:', emailError);
            }

            const notificationMessages: Record<OrderStatus, { title: string; message: string }> = {
                pending: { title: 'Order Pending', message: 'Your order is pending.' },
                processing: { title: 'Order Processing', message: 'Your order is being processed.' },
                shipped: {
                    title: 'Order Shipped!',
                    message: `Your order has been shipped. ${dto.trackingNumber ? `Tracking: ${dto.trackingNumber}` : ''}`
                },
                delivered: { title: 'Order Delivered', message: 'Your order has been delivered successfully!' },
                cancelled: { title: 'Order Cancelled', message: 'Your order has been cancelled.' },
            };

            const notifMessage = notificationMessages[newStatus];
            const user = order.user as unknown as IUser;

            try {
                await NotificationService.sendNotification({
                    userId: user._id.toString(),
                    type: `order_${newStatus}` as NotificationType,
                    title: notifMessage.title,
                    message: notifMessage.message,
                    priority: newStatus === 'delivered' ? 'high' : 'medium',
                    relatedOrder: order._id.toString(),
                    actionUrl: `/orders/${order._id}`,
                    userEmail: user.email,
                    metadata: { trackingNumber: dto.trackingNumber },
                });
                console.log(`Order status notification sent to ${user.email} - Status: ${newStatus}`);
            } catch (error) {
                console.error('Failed to send order status notification:', error);
            }

            return savedOrder;
        });
    }

    private static validateStatusTransition(oldStatus: OrderStatus, newStatus: OrderStatus): void {
        const invalidTransitions: Record<OrderStatus, OrderStatus[]> = {
            'pending': [],
            'processing': [],
            'shipped': ['pending'],
            'delivered': ['pending', 'processing'],
            'cancelled': ['delivered'],
        };

        if (invalidTransitions[newStatus]?.includes(oldStatus)) {
            throw new Error(`Cannot change status from ${oldStatus} to ${newStatus}`);
        }

        if (oldStatus === 'cancelled') {
            throw new Error('Cannot modify a cancelled order');
        }

        if (oldStatus === 'delivered') {
            throw new Error('Cannot modify a delivered order');
        }
    }

    private static async restoreStock(
        order: IOrder,
        session: mongoose.ClientSession | null
    ): Promise<void> {
        for (const item of order.items) {
            const update = Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } }
            );

            if (session) {
                await update.session(session);
            } else {
                await update;
            }
        }
    }

    static async getOrderStats(): Promise<Record<string, unknown>> {
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$totalPrice' },
                },
            },
        ]);

        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]);

        return {
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            byStatus: stats,
        };
    }

    static async cancelOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<IOrder | null> {
        const order = await Order.findById(orderId).populate('user', 'name email');

        if (!order) {
            throw new Error('Order not found');
        }

        if (!isAdmin && order.user._id.toString() !== userId) {
            throw new Error('Access denied');
        }

        if (order.status === 'delivered') {
            throw new Error('Cannot cancel a delivered order');
        }

        if (order.status === 'cancelled') {
            throw new Error('Order is already cancelled');
        }

        return await this.updateOrderStatus(orderId, { status: 'cancelled' });
    }
}