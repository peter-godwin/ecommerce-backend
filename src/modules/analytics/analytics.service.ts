import { AnalyticsEvent, IAnalyticsEvent } from './analytics.model';
import { Order } from '../order/order.model';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { Payment } from '../payment/payment.model';
import { Wishlist } from '../wishlist/wishlist.model';


export class AnalyticsService {
    static async trackEvent(data: {
        eventType: 'page_view' | 'product_view' | 'add_to_cart' | 'add_to_wishlist' | 'purchase' | 'search';
        userId?: string;
        productId?: string;
        orderId?: string;
        metadata?: Record<string, unknown>;
        sessionId?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        try {
            await AnalyticsEvent.create(data as unknown as IAnalyticsEvent);
        } catch (error) {
            console.error('Analytics tracking error:', error);
        }
    }

    static async getDashboardOverview(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<Record<string, unknown>> {
        const dateRange = this.getDateRange(period);

        const [
            totalRevenue,
            totalOrders,
            totalUsers,
            totalProducts,
            revenueGrowth,
            orderGrowth,
            userGrowth,
            averageOrderValue,
        ] = await Promise.all([
            this.getTotalRevenue(dateRange),
            this.getTotalOrders(dateRange),
            this.getTotalUsers(dateRange),
            this.getTotalProducts(),
            this.getRevenueGrowth(period),
            this.getOrderGrowth(period),
            this.getUserGrowth(period),
            this.getAverageOrderValue(dateRange),
        ]);

        return {
            period,
            dateRange: {
                from: dateRange.from,
                to: dateRange.to,
            },
            summary: {
                totalRevenue,
                totalOrders,
                totalUsers,
                totalProducts,
                averageOrderValue,
            },
            growth: {
                revenue: revenueGrowth,
                orders: orderGrowth,
                users: userGrowth,
            },
        };
    }

    static async getSalesReport(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<Record<string, unknown>> {
        const dateRange = this.getDateRange(period);
        const groupBy = this.getGroupByFormat(period);

        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: dateRange.from, $lte: dateRange.to },
                    paymentStatus: 'paid',
                },
            },
            {
                $group: {
                    _id: groupBy,
                    totalSales: { $sum: '$finalPrice' },
                    totalOrders: { $sum: 1 },
                    averageOrderValue: { $avg: '$finalPrice' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        return {
            period,
            data: salesData,
        };
    }

    static async getRevenueAnalytics(period: 'month' | 'year' = 'month'): Promise<Record<string, unknown>> {
        const dateRange = this.getDateRange(period);

        const [
            totalRevenue,
            revenueByStatus,
            revenueByPaymentMethod,
            topRevenueProducts,
        ] = await Promise.all([
            Payment.aggregate([
                { $match: { status: 'succeeded', createdAt: { $gte: dateRange.from } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: dateRange.from } } },
                { $group: { _id: '$paymentStatus', total: { $sum: '$finalPrice' }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: dateRange.from }, paymentStatus: 'paid' } },
                { $group: { _id: '$paymentMethod', total: { $sum: '$finalPrice' }, count: { $sum: 1 } } },
            ]),
            this.getTopRevenueProducts(dateRange, 10),
        ]);

        return {
            totalRevenue: totalRevenue[0]?.total || 0,
            revenueByStatus,
            revenueByPaymentMethod,
            topRevenueProducts,
        };
    }

    static async getProductAnalytics(): Promise<Record<string, unknown>> {
        const [
            bestSellers,
            mostViewed,
            mostWishlisted,
            topRated,
            lowStock,
            outOfStock,
        ] = await Promise.all([
            this.getBestSellers(10),
            this.getMostViewedProducts(10),
            this.getMostWishlistedProducts(10),
            this.getTopRatedProducts(10),
            this.getLowStockProducts(10),
            this.getOutOfStockProducts(10),
        ]);

        return {
            bestSellers,
            mostViewed,
            mostWishlisted,
            topRated,
            lowStock,
            outOfStock,
        };
    }

    static async getUserAnalytics(period: 'month' | 'year' = 'month'): Promise<Record<string, unknown>> {
        const dateRange = this.getDateRange(period);

        const [
            totalUsers,
            newUsers,
            activeUsers,
            usersByRole,
            userGrowth,
            topCustomers,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: dateRange.from } }),
            this.getActiveUsers(dateRange),
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
            ]),
            this.getUserGrowthTrend(period),
            this.getTopCustomers(10),
        ]);

        return {
            totalUsers,
            newUsers,
            activeUsers,
            usersByRole,
            userGrowth,
            topCustomers,
        };
    }

    static async getOrderAnalytics(period: 'month' | 'year' = 'month'): Promise<Record<string, unknown>> {
        const dateRange = this.getDateRange(period);

        const [
            totalOrders,
            ordersByStatus,
            ordersByPaymentStatus,
            averageOrderValue,
            orderTrend,
        ] = await Promise.all([
            Order.countDocuments({ createdAt: { $gte: dateRange.from } }),
            Order.aggregate([
                { $match: { createdAt: { $gte: dateRange.from } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: dateRange.from } } },
                { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
            ]),
            this.getAverageOrderValue(dateRange),
            this.getOrderTrend(period),
        ]);

        return {
            totalOrders,
            ordersByStatus,
            ordersByPaymentStatus,
            averageOrderValue,
            orderTrend,
        };
    }

    private static getDateRange(period: string): { from: Date; to: Date } {
        const now = new Date();
        const to = new Date(now);
        const from = new Date(now);

        switch (period) {
            case 'today':
            case 'day':
                from.setHours(0, 0, 0, 0);
                break;
            case 'week':
                from.setDate(now.getDate() - 7);
                break;
            case 'month':
                from.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                from.setFullYear(now.getFullYear() - 1);
                break;
        }

        return { from, to };
    }

    private static getGroupByFormat(period: string): Record<string, unknown> {
        switch (period) {
            case 'day':
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                    hour: { $hour: '$createdAt' },
                };
            case 'week':
            case 'month':
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                };
            case 'year':
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                };
            default:
                return { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        }
    }

    private static async getTotalRevenue(dateRange: { from: Date; to: Date }): Promise<number> {
        const result = await Payment.aggregate([
            {
                $match: {
                    status: 'succeeded',
                    createdAt: { $gte: dateRange.from, $lte: dateRange.to },
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        return result[0]?.total || 0;
    }

    private static async getTotalOrders(dateRange: { from: Date; to: Date }): Promise<number> {
        return await Order.countDocuments({
            createdAt: { $gte: dateRange.from, $lte: dateRange.to },
        });
    }

    private static async getTotalUsers(dateRange: { from: Date; to: Date }): Promise<number> {
        return await User.countDocuments({
            createdAt: { $gte: dateRange.from, $lte: dateRange.to },
        });
    }

    private static async getTotalProducts(): Promise<number> {
        return await Product.countDocuments({ isActive: true });
    }

    private static async getAverageOrderValue(dateRange: { from: Date; to: Date }): Promise<number> {
        const result = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: dateRange.from, $lte: dateRange.to },
                    paymentStatus: 'paid',
                },
            },
            { $group: { _id: null, avg: { $avg: '$finalPrice' } } },
        ]);

        return Math.round((result[0]?.avg || 0) * 100) / 100;
    }

    private static async getRevenueGrowth(period: string): Promise<number> {
        const currentRange = this.getDateRange(period);
        const previousRange = this.getPreviousDateRange(period);

        const [currentRevenue, previousRevenue] = await Promise.all([
            this.getTotalRevenue(currentRange),
            this.getTotalRevenue(previousRange),
        ]);

        if (previousRevenue === 0) return 100;
        return Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100 * 100) / 100;
    }

    private static async getOrderGrowth(period: string): Promise<number> {
        const currentRange = this.getDateRange(period);
        const previousRange = this.getPreviousDateRange(period);

        const [currentOrders, previousOrders] = await Promise.all([
            this.getTotalOrders(currentRange),
            this.getTotalOrders(previousRange),
        ]);

        if (previousOrders === 0) return 100;
        return Math.round(((currentOrders - previousOrders) / previousOrders) * 100 * 100) / 100;
    }

    private static async getUserGrowth(period: string): Promise<number> {
        const currentRange = this.getDateRange(period);
        const previousRange = this.getPreviousDateRange(period);

        const [currentUsers, previousUsers] = await Promise.all([
            this.getTotalUsers(currentRange),
            this.getTotalUsers(previousRange),
        ]);

        if (previousUsers === 0) return 100;
        return Math.round(((currentUsers - previousUsers) / previousUsers) * 100 * 100) / 100;
    }

    private static getPreviousDateRange(period: string): { from: Date; to: Date } {
        const current = this.getDateRange(period);
        const diff = current.to.getTime() - current.from.getTime();

        return {
            from: new Date(current.from.getTime() - diff),
            to: current.from,
        };
    }

    private static async getBestSellers(limit: number): Promise<unknown[]> {
        return Order.aggregate([
            {$match: {paymentStatus: 'paid'}},
            {$unwind: '$items'},
            {
                $group: {
                    _id: '$items.product',
                    totalSold: {$sum: '$items.quantity'},
                    revenue: {$sum: {$multiply: ['$items.price', '$items.quantity']}},
                },
            },
            {$sort: {totalSold: -1}},
            {$limit: limit},
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            {$unwind: '$product'},
            {
                $project: {
                    _id: 0,
                    product: {
                        _id: '$product._id',
                        name: '$product.name',
                        price: '$product.price',
                        images: '$product.images',
                    },
                    totalSold: 1,
                    revenue: 1,
                },
            },
        ]);
    }

    private static async getMostViewedProducts(limit: number): Promise<unknown[]> {
        return await AnalyticsEvent.aggregate([
            { $match: { eventType: 'product_view' } },
            { $group: { _id: '$productId', views: { $sum: 1 } } },
            { $sort: { views: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: 0,
                    product: {
                        _id: '$product._id',
                        name: '$product.name',
                        price: '$product.price',
                        images: '$product.images',
                    },
                    views: 1,
                },
            },
        ]);
    }

    private static async getMostWishlistedProducts(limit: number): Promise<unknown[]> {
        return await Wishlist.aggregate([
            { $unwind: '$items' },
            { $group: { _id: '$items.product', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: 0,
                    product: {
                        _id: '$product._id',
                        name: '$product.name',
                        price: '$product.price',
                        images: '$product.images',
                    },
                    wishlistCount: '$count',
                },
            },
        ]);
    }

    private static async getTopRatedProducts(limit: number): Promise<unknown[]> {
        return await Product.find({ rating: { $gt: 0 } })
            .sort({ rating: -1, numReviews: -1 })
            .limit(limit)
            .select('_id name price rating numReviews images')
            .lean();
    }

    private static async getLowStockProducts(limit: number): Promise<unknown[]> {
        return await Product.find({ stock: { $gt: 0, $lte: 10 }, isActive: true })
            .sort({ stock: 1 })
            .limit(limit)
            .select('_id name price stock sku')
            .lean();
    }

    private static async getOutOfStockProducts(limit: number): Promise<unknown[]> {
        return await Product.find({ stock: 0, isActive: true })
            .limit(limit)
            .select('_id name price stock sku')
            .lean();
    }

    private static async getTopRevenueProducts(dateRange: { from: Date; to: Date }, limit: number): Promise<unknown[]> {
        return await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: dateRange.from },
                    paymentStatus: 'paid',
                },
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    unitsSold: { $sum: '$items.quantity' },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: 0,
                    product: {
                        _id: '$product._id',
                        name: '$product.name',
                        price: '$product.price',
                    },
                    revenue: 1,
                    unitsSold: 1,
                },
            },
        ]);
    }

    private static async getActiveUsers(dateRange: { from: Date; to: Date }): Promise<number> {
        const activeUserIds = await Order.distinct('user', {
            createdAt: { $gte: dateRange.from },
        });

        return activeUserIds.length;
    }

    private static async getUserGrowthTrend(period: string): Promise<unknown[]> {
        const dateRange = this.getDateRange(period);
        const groupBy = this.getGroupByFormat(period);

        return await User.aggregate([
            { $match: { createdAt: { $gte: dateRange.from } } },
            { $group: { _id: groupBy, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
    }

    private static async getTopCustomers(limit: number): Promise<unknown[]> {
        return await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: '$user',
                    totalSpent: { $sum: '$finalPrice' },
                    orderCount: { $sum: 1 },
                },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 0,
                    user: {
                        _id: '$user._id',
                        name: '$user.name',
                        email: '$user.email',
                    },
                    totalSpent: 1,
                    orderCount: 1,
                },
            },
        ]);
    }

    private static async getOrderTrend(period: string): Promise<unknown[]> {
        const dateRange = this.getDateRange(period);
        const groupBy = this.getGroupByFormat(period);

        return await Order.aggregate([
            { $match: { createdAt: { $gte: dateRange.from } } },
            {
                $group: {
                    _id: groupBy,
                    count: { $sum: 1 },
                    revenue: { $sum: '$finalPrice' },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }
}