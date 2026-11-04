import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { AnalyticsService } from './analytics.service';

export const getDashboardOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'month';

    const overview = await AnalyticsService.getDashboardOverview(period);

    res.status(200).json({
        success: true,
        overview,
    });
});

export const getSalesReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'month';

    const report = await AnalyticsService.getSalesReport(period);

    res.status(200).json({
        success: true,
        report,
    });
});

export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'month' | 'year') || 'month';

    const analytics = await AnalyticsService.getRevenueAnalytics(period);

    res.status(200).json({
        success: true,
        analytics,
    });
});

export const getProductAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const analytics = await AnalyticsService.getProductAnalytics();

    res.status(200).json({
        success: true,
        analytics,
    });
});

export const getUserAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'month' | 'year') || 'month';

    const analytics = await AnalyticsService.getUserAnalytics(period);

    res.status(200).json({
        success: true,
        analytics,
    });
});

export const getOrderAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as 'month' | 'year') || 'month';

    const analytics = await AnalyticsService.getOrderAnalytics(period);

    res.status(200).json({
        success: true,
        analytics,
    });
});

export const trackEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { eventType, productId, metadata } = req.body;

    if (!eventType) {
        res.status(400).json({ success: false, message: 'Event type is required' });
        return;
    }

    await AnalyticsService.trackEvent({
        eventType,
        userId: req.user?._id.toString(),
        productId,
        metadata,
        sessionId: req.headers['x-session-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
        success: true,
        message: 'Event tracked',
    });
});