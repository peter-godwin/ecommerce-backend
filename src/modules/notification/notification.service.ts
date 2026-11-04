import { Notification, INotification, NotificationType, NotificationPriority } from './notification.model';
import { NotificationPreferences, INotificationPreferences } from './notification-preferences.model';
import { sendEmail } from '../../utils/email';
import mongoose from 'mongoose';
import { User, IUser } from '../user/user.model';

export interface CreateNotificationDTO {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    relatedOrder?: string;
    relatedProduct?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    expiresInDays?: number;
}

export class NotificationService {
    static async createNotification(dto: CreateNotificationDTO): Promise<INotification> {
        const expiresAt = dto.expiresInDays
            ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
            : undefined;

        const notification = await Notification.create({
            user: dto.userId,
            type: dto.type,
            title: dto.title,
            message: dto.message,
            priority: dto.priority || 'medium',
            relatedOrder: dto.relatedOrder,
            relatedProduct: dto.relatedProduct,
            actionUrl: dto.actionUrl,
            metadata: dto.metadata,
            expiresAt,
        });

        return notification;
    }

    static async getUserNotifications(
        userId: string,
        filters?: {
            isRead?: boolean;
            type?: NotificationType;
            page?: number;
            limit?: number;
        }
    ): Promise<{
        notifications: INotification[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const page = Math.max(1, filters?.page || 1);
        const limit = Math.min(50, Math.max(1, filters?.limit || 20));
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = { user: userId };

        if (filters?.isRead !== undefined) {
            query.isRead = filters.isRead;
        }

        if (filters?.type) {
            query.type = filters.type;
        }

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .populate('relatedOrder', 'orderNumber status')
                .populate('relatedProduct', 'name images')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(query),
        ]);

        return {
            notifications: notifications as INotification[],
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    static async getUnreadCount(userId: string): Promise<number> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        return await Notification.countDocuments({ user: userId, isRead: false });
    }

    static async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            throw new Error('Invalid notification ID');
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId, isRead: false },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        return notification;
    }

    static async markAsUnread(notificationId: string, userId: string): Promise<INotification | null> {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            throw new Error('Invalid notification ID');
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { isRead: false, $unset: { readAt: 1 } },
            { new: true }
        );

        return notification;
    }

    static async markAllAsRead(userId: string): Promise<number> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const result = await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        return result.modifiedCount;
    }

    static async deleteNotification(notificationId: string, userId: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            throw new Error('Invalid notification ID');
        }

        await Notification.findOneAndDelete({ _id: notificationId, user: userId });
    }

    static async deleteAllNotifications(userId: string): Promise<number> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const result = await Notification.deleteMany({ user: userId });
        return result.deletedCount;
    }

    static async getPreferences(userId: string): Promise<INotificationPreferences> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        let preferences = await NotificationPreferences.findOne({ user: userId });

        if (!preferences) {
            preferences = await NotificationPreferences.create({ user: userId });
        }

        return preferences;
    }

    static async updatePreferences(
        userId: string,
        updates: Partial<INotificationPreferences>
    ): Promise<INotificationPreferences> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        let preferences = await NotificationPreferences.findOne({ user: userId });

        if (!preferences) {
            preferences = await NotificationPreferences.create({ user: userId, ...updates });
        } else {
            Object.assign(preferences, updates);
            await preferences.save();
        }

        return preferences;
    }

    static async sendNotification(dto: CreateNotificationDTO & { userEmail?: string }): Promise<void> {
        await this.createNotification(dto);

        const preferences = await this.getPreferences(dto.userId);

        const shouldSendEmail = this.shouldSendEmail(dto.type, preferences);

        if (shouldSendEmail && dto.userEmail) {
            try {
                await sendEmail({
                    to: dto.userEmail,
                    subject: dto.title,
                    html: this.generateEmailTemplate(dto),
                });
            } catch (error) {
                console.error('Failed to send notification email:', error);
            }
        }
    }

    private static shouldSendEmail(
        type: NotificationType,
        preferences: INotificationPreferences
    ): boolean {
        const typeMap: Record<string, keyof typeof preferences.email> = {
            order_placed: 'orderUpdates',
            order_confirmed: 'orderUpdates',
            order_shipped: 'orderUpdates',
            order_delivered: 'orderUpdates',
            order_cancelled: 'orderUpdates',
            payment_success: 'orderUpdates',
            payment_failed: 'orderUpdates',
            promotion: 'promotions',
            price_drop: 'priceDrops',
            back_in_stock: 'backInStock',
        };

        const prefKey = typeMap[type];
        return prefKey ? preferences.email[prefKey] : false;
    }

    private static generateEmailTemplate(dto: CreateNotificationDTO): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #667eea; color: white; padding: 20px; text-align: center; }
                    .content { background: #f9fafb; padding: 30px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>${dto.title}</h2>
                    </div>
                    <div class="content">
                        <p>${dto.message}</p>
                        ${dto.actionUrl ? `<a href="${dto.actionUrl}" class="button">View Details</a>` : ''}
                    </div>
                    <div class="footer">
                        <p>You're receiving this because you have notifications enabled.</p>
                        <p>Update your preferences in your account settings.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    static async sendBulkNotifications(
        userIds: string[],
        notification: Omit<CreateNotificationDTO, 'userId'>
    ): Promise<void> {
        const notifications = userIds.map(userId => ({
            ...notification,
            user: userId,
        }));

        await Notification.insertMany(notifications);

        await this.sendBulkEmails(userIds, notification);
    }

    private static async sendBulkEmails(
        userIds: string[],
        notification: Omit<CreateNotificationDTO, 'userId'>
    ): Promise<void> {
        const typeMap: Record<string, string> = {
            order_placed: 'orderUpdates',
            order_confirmed: 'orderUpdates',
            order_shipped: 'orderUpdates',
            order_delivered: 'orderUpdates',
            order_cancelled: 'orderUpdates',
            payment_success: 'orderUpdates',
            payment_failed: 'orderUpdates',
            promotion: 'promotions',
            price_drop: 'priceDrops',
            back_in_stock: 'backInStock',
            system: 'promotions',
        };

        const prefKey = typeMap[notification.type];
        if (!prefKey) return;

        const users = await User.find({
            _id: { $in: userIds },
            isActive: true,
        }).select('email').lean();

        const userIdsArray = users.map((u) => u._id.toString());
        const preferences = await NotificationPreferences.find({ user: { $in: userIdsArray } });

        const prefMap = new Map(preferences.map((p: INotificationPreferences) => [p.user.toString(), p]));

        const emailPromises = users
            .filter((user) => {
                const pref = prefMap.get(user._id.toString());
                if (!pref) return true;
                const shouldSend = (pref.email as Record<string, unknown>)[prefKey] as boolean | undefined;
                return shouldSend !== false;
            })
            .map((user) =>
                sendEmail({
                    to: user.email,
                    subject: notification.title,
                    html: this.generateEmailTemplate({
                        ...notification,
                        userId: user._id.toString(),
                    } as CreateNotificationDTO),
                }).catch(error => console.error(`Failed to send email to ${user.email}:`, error))
            );

        await Promise.all(emailPromises);
    }

    static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        const result = await Notification.deleteMany({
            createdAt: { $lt: cutoffDate },
            isRead: true,
        });

        return result.deletedCount;
    }
}