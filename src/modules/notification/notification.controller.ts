import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotificationService } from './notification.service';
import { validateUpdatePreferences } from './notification.dto';
import { INotificationPreferences } from './notification-preferences.model';
import { NotificationType } from './notification.model';

export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const filters = {
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
        type: (req.query.type as NotificationType) || undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await NotificationService.getUserNotifications(req.user._id.toString(), filters);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const count = await NotificationService.getUnreadCount(req.user._id.toString());

    res.status(200).json({
        success: true,
        unreadCount: count,
    });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid notification ID' });
        return;
    }
    const notification = await NotificationService.markAsRead(id, req.user._id.toString());

    if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        notification,
    });
});

export const markAsUnread = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid notification ID' });
        return;
    }
    const notification = await NotificationService.markAsUnread(id, req.user._id.toString());

    if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Notification marked as unread',
        notification,
    });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const count = await NotificationService.markAllAsRead(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: `${count} notification(s) marked as read`,
        count,
    });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid notification ID' });
        return;
    }
    await NotificationService.deleteNotification(id, req.user._id.toString());

    res.status(200).json({
        success: true,
        message: 'Notification deleted',
    });
});

export const deleteAllNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const count = await NotificationService.deleteAllNotifications(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: `${count} notification(s) deleted`,
        count,
    });
});

export const getPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const preferences = await NotificationService.getPreferences(req.user._id.toString());

    res.status(200).json({
        success: true,
        preferences,
    });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const updates = validateUpdatePreferences(req.body) as Partial<INotificationPreferences>;
    const preferences = await NotificationService.updatePreferences(req.user._id.toString(), updates);

    res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        preferences,
    });
});

export const sendBulkNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userIds, title, message, type, priority, actionUrl, expiresInDays } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ success: false, message: 'User IDs array is required' });
        return;
    }

    if (!title || !message || !type) {
        res.status(400).json({ success: false, message: 'Title, message, and type are required' });
        return;
    }

    await NotificationService.sendBulkNotifications(userIds, {
        type,
        title,
        message,
        priority,
        actionUrl,
        expiresInDays,
    });

    res.status(200).json({
        success: true,
        message: `Notification sent to ${userIds.length} user(s)`,
    });
});