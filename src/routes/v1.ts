import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/user/user.routes';
import productRoutes from '../modules/product/product.routes';
import cartRoutes from '../modules/cart/cart.routes';
import orderRoutes from '../modules/order/order.routes';
import paymentRoutes from '../modules/payment/payment.routes';
import uploadRoutes from '../modules/upload/upload.routes';
import reviewRoutes from '../modules/review/review.routes';
import couponRoutes from '../modules/coupon/coupon.routes';
import wishlistRoutes from '../modules/wishlist/wishlist.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import shippingRoutes from '../modules/shipping/shipping.routes';
import giftcardRoutes from '../modules/giftcard/giftcard.routes';
import searchRoutes from '../modules/search/search.routes';
import supportRoutes from '../modules/support/support.routes';
import { env } from '../config/env';
import { getVersionInfo } from '../config/version';

const v1Router = Router();

v1Router.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        version: 'v1',
        packageVersion: getVersionInfo().packageVersion,
        environment: env.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

v1Router.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'E-Commerce API v1',
        version: 'v1',
        packageVersion: getVersionInfo().packageVersion,
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            products: '/api/v1/products',
            cart: '/api/v1/cart',
            orders: '/api/v1/orders',
            payments: '/api/v1/payments',
            uploads: '/api/v1/uploads',
            reviews: '/api/v1/reviews',
            coupons: '/api/v1/coupons',
            wishlist: '/api/v1/wishlist',
            analytics: '/api/v1/analytics',
            notifications: '/api/v1/notifications',
            shipping: '/api/v1/shipping',
            giftcards: '/api/v1/giftcards',
            search: '/api/v1/search',
            support: '/api/v1/support',
            health: '/api/v1/health',
        },
    });
});

v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/products', productRoutes);
v1Router.use('/cart', cartRoutes);
v1Router.use('/orders', orderRoutes);
v1Router.use('/payments', paymentRoutes);
v1Router.use('/uploads', uploadRoutes);
v1Router.use('/reviews', reviewRoutes);
v1Router.use('/coupons', couponRoutes);
v1Router.use('/wishlist', wishlistRoutes);
v1Router.use('/analytics', analyticsRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/shipping', shippingRoutes);
v1Router.use('/giftcards', giftcardRoutes);
v1Router.use('/search', searchRoutes);
v1Router.use('/support', supportRoutes);

export default v1Router;
