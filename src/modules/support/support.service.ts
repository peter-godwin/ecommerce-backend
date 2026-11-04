import { Ticket, ITicket, TicketStatus, TicketCategory, TicketPriority, generateTicketNumber } from './ticket.model';
import mongoose from 'mongoose';
import { FAQ, IFAQ, FAQCategory } from './faq.model';
import { NotificationService } from '../notification/notification.service';
import {
    CreateTicketDTO,
    AddMessageDTO,
    UpdateTicketDTO,
    RateTicketDTO,
    CreateFAQDTO,
} from './support.dto';

export class SupportService {

    static async createTicket(
        userId: string,
        userEmail: string,
        dto: CreateTicketDTO
    ): Promise<ITicket> {
        let ticketNumber = generateTicketNumber();

        while (await Ticket.findOne({ ticketNumber })) {
            ticketNumber = generateTicketNumber();
        }

        const ticket = await Ticket.create({
            ticketNumber,
            user: userId,
            subject: dto.subject,
            category: dto.category as TicketCategory,
            priority: (dto.priority as TicketPriority) || 'medium',
            status: 'open',
            relatedOrder: dto.relatedOrder,
            relatedProduct: dto.relatedProduct,
            messages: [{
                sender: userId,
                senderRole: 'customer',
                message: dto.message,
                attachments: dto.attachments || [],
                isInternal: false,
                createdAt: new Date(),
            }],
            lastResponseBy: 'customer',
            lastResponseAt: new Date(),
        });


        try {
            await NotificationService.createNotification({
                userId,
                type: 'system',
                title: 'Support Ticket Created',
                message: `Your ticket #${ticketNumber} has been created. We'll respond as soon as possible.`,
                priority: 'medium',
                actionUrl: `/support/tickets/${ticket._id}`,
            });
        } catch (error) {
            console.error('Failed to send ticket creation notification:', error);
        }

        return ticket;
    }

    static async getUserTickets(
        userId: string,
        filters?: { status?: TicketStatus; page?: number; limit?: number }
    ): Promise<{
        tickets: ITicket[];
        pagination: { page: number; limit: number; total: number; pages: number };
    }> {
        const page = Math.max(1, filters?.page || 1);
        const limit = Math.min(50, Math.max(1, filters?.limit || 20));
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = { user: userId };
        if (filters?.status) {
            query.status = filters.status;
        }

        const [tickets, total] = await Promise.all([
            Ticket.find(query)
                .select('-messages')
                .populate('relatedOrder', 'status')
                .populate('assignedTo', 'name')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Ticket.countDocuments(query),
        ]);

        return {
            tickets: tickets as ITicket[],
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    static async getTicketById(
        ticketId: string,
        userId: string,
        isAdmin: boolean
    ): Promise<ITicket> {
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            throw new Error('Invalid ticket ID');
        }

        const ticket = await Ticket.findById(ticketId)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email')
            .populate('relatedOrder', 'status finalPrice')
            .populate('relatedProduct', 'name images')
            .populate('messages.sender', 'name avatar role');

        if (!ticket) {
            throw new Error('Ticket not found');
        }

        const ownerId = (ticket.user as unknown as { _id?: { toString(): string } })._id?.toString() || ticket.user.toString();
        if (!isAdmin && ownerId !== userId) {
            throw new Error('Access denied');
        }

        if (!isAdmin) {
            ticket.messages = ticket.messages.filter(m => !m.isInternal);
        }

        return ticket;
    }

    static async addMessage(
        ticketId: string,
        senderId: string,
        senderRole: 'customer' | 'admin',
        isAdmin: boolean,
        dto: AddMessageDTO
    ): Promise<ITicket> {
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            throw new Error('Invalid ticket ID');
        }

        const ticket = await Ticket.findById(ticketId).populate('user', 'name email');
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        const ownerId = (ticket.user as unknown as { _id?: { toString(): string } })._id?.toString() || ticket.user.toString();
        if (!isAdmin && ownerId !== senderId) {
            throw new Error('Access denied');
        }

        if (ticket.status === 'closed') {
            throw new Error('Cannot reply to a closed ticket. Please create a new ticket.');
        }

        const isInternal = isAdmin && dto.isInternal === true;

        ticket.messages.push({
            sender: new mongoose.Types.ObjectId(senderId),
            senderRole,
            message: dto.message,
            attachments: dto.attachments || [],
            isInternal,
            createdAt: new Date(),
        });

        if (!isInternal) {
            ticket.lastResponseBy = senderRole;
            ticket.lastResponseAt = new Date();

            if (senderRole === 'admin' && ticket.status === 'open') {
                ticket.status = 'in_progress';
            } else if (senderRole === 'admin') {
                ticket.status = 'awaiting_customer';
            } else if (senderRole === 'customer' && ticket.status === 'awaiting_customer') {
                ticket.status = 'in_progress';
            }
        }

        await ticket.save();

        if (!isInternal) {
            const user = ticket.user as unknown as { _id: { toString(): string }; email?: string };

            if (senderRole === 'admin') {
                try {
                    await NotificationService.sendNotification({
                        userId: user._id.toString(),
                        type: 'system',
                        title: 'Support Team Replied',
                        message: `You have a new reply on ticket #${ticket.ticketNumber}: "${ticket.subject}"`,
                        priority: 'medium',
                        actionUrl: `/support/tickets/${ticket._id}`,
                        userEmail: user.email,
                    });
                } catch (error) {
                    console.error('Failed to notify customer of reply:', error);
                }
            } else if (ticket.assignedTo) {
                try {
                    await NotificationService.createNotification({
                        userId: ticket.assignedTo.toString(),
                        type: 'system',
                        title: 'Customer Replied',
                        message: `New reply on ticket #${ticket.ticketNumber}: "${ticket.subject}"`,
                        priority: 'medium',
                        actionUrl: `/admin/support/tickets/${ticket._id}`,
                    });
                } catch (error) {
                    console.error('Failed to notify admin of reply:', error);
                }
            }
        }

        return ticket;
    }

    static async updateTicket(ticketId: string, dto: UpdateTicketDTO): Promise<ITicket> {
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            throw new Error('Invalid ticket ID');
        }

        const ticket = await Ticket.findById(ticketId).populate('user', 'name email');
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        const oldStatus = ticket.status;

        if (dto.status) {
            ticket.status = dto.status as TicketStatus;

            if (dto.status === 'resolved' && oldStatus !== 'resolved') {
                ticket.resolvedAt = new Date();
            }
            if (dto.status === 'closed' && oldStatus !== 'closed') {
                ticket.closedAt = new Date();
            }
        }

        if (dto.priority) {
            ticket.priority = dto.priority as TicketPriority;
        }

        if (dto.assignedTo !== undefined) {
            ticket.assignedTo = dto.assignedTo ? new mongoose.Types.ObjectId(dto.assignedTo) : undefined;
        }

        await ticket.save();

        if (dto.status === 'resolved' && oldStatus !== 'resolved') {
            const user = ticket.user as unknown as { _id: { toString(): string }; email?: string };
            try {
                await NotificationService.sendNotification({
                    userId: user._id.toString(),
                    type: 'system',
                    title: 'Ticket Resolved',
                    message: `Your ticket #${ticket.ticketNumber} has been marked as resolved. Let us know if you need further help!`,
                    priority: 'medium',
                    actionUrl: `/support/tickets/${ticket._id}`,
                    userEmail: user.email,
                });
            } catch (error) {
                console.error('Failed to notify customer of resolution:', error);
            }
        }

        return ticket;
    }

    static async rateTicket(ticketId: string, userId: string, dto: RateTicketDTO): Promise<ITicket> {
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            throw new Error('Invalid ticket ID');
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        if (ticket.user.toString() !== userId) {
            throw new Error('Access denied');
        }

        if (!['resolved', 'closed'].includes(ticket.status)) {
            throw new Error('Can only rate resolved or closed tickets');
        }

        ticket.satisfactionRating = dto.rating;
        ticket.satisfactionFeedback = dto.feedback;

        await ticket.save();

        return ticket;
    }

    static async getAllTickets(filters?: {
        status?: TicketStatus;
        priority?: string;
        category?: string;
        assignedTo?: string;
        unassigned?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        tickets: ITicket[];
        pagination: { page: number; limit: number; total: number; pages: number };
    }> {
        const page = Math.max(1, filters?.page || 1);
        const limit = Math.min(100, Math.max(1, filters?.limit || 20));
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = {};

        if (filters?.status) query.status = filters.status;
        if (filters?.priority) query.priority = filters.priority;
        if (filters?.category) query.category = filters.category;
        if (filters?.assignedTo) query.assignedTo = filters.assignedTo;
        if (filters?.unassigned) query.assignedTo = { $exists: false };

        const [tickets, total] = await Promise.all([
            Ticket.find(query)
                .select('-messages')
                .populate('user', 'name email')
                .populate('assignedTo', 'name')
                .sort({ priority: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Ticket.countDocuments(query),
        ]);

        return {
            tickets: tickets as ITicket[],
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    static async getSupportStats(): Promise<Record<string, unknown>> {
        const [byStatus, byPriority, byCategory, avgSatisfaction, avgResponseTime] = await Promise.all([
            Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Ticket.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
            Ticket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
            Ticket.aggregate([
                { $match: { satisfactionRating: { $exists: true } } },
                { $group: { _id: null, avg: { $avg: '$satisfactionRating' }, count: { $sum: 1 } } },
            ]),
            Ticket.aggregate([
                { $match: { resolvedAt: { $exists: true } } },
                {
                    $project: {
                        responseTimeHours: {
                            $divide: [
                                { $subtract: ['$resolvedAt', '$createdAt'] },
                                1000 * 60 * 60,
                            ],
                        },
                    },
                },
                { $group: { _id: null, avgHours: { $avg: '$responseTimeHours' } } },
            ]),
        ]);

        return {
            byStatus,
            byPriority,
            byCategory,
            avgSatisfactionRating: Math.round((avgSatisfaction[0]?.avg || 0) * 10) / 10,
            totalRatings: avgSatisfaction[0]?.count || 0,
            avgResolutionTimeHours: Math.round((avgResponseTime[0]?.avgHours || 0) * 10) / 10,
        };
    }


    static async createFAQ(dto: CreateFAQDTO): Promise<IFAQ> {
        return await FAQ.create({ ...dto, category: dto.category as FAQCategory });
    }

    static async getFAQs(filters?: {
        category?: string;
        query?: string;
    }): Promise<IFAQ[]> {
        const query: Record<string, unknown> = { isPublished: true };

        if (filters?.category) {
            query.category = filters.category;
        }

        if (filters?.query) {
            return await FAQ.find(
                { ...query, $text: { $search: filters.query } },
                { score: { $meta: 'textScore' } }
            )
                .sort({ score: { $meta: 'textScore' } })
                .limit(20);
        }

        return await FAQ.find(query).sort({ category: 1, order: 1 });
    }

    static async getFAQById(faqId: string): Promise<IFAQ> {
        if (!mongoose.Types.ObjectId.isValid(faqId)) {
            throw new Error('Invalid FAQ ID');
        }

        const faq = await FAQ.findByIdAndUpdate(
            faqId,
            { $inc: { viewCount: 1 } },
            { new: true }
        );

        if (!faq) {
            throw new Error('FAQ not found');
        }

        return faq;
    }

    static async voteFAQ(faqId: string, helpful: boolean): Promise<IFAQ> {
        if (!mongoose.Types.ObjectId.isValid(faqId)) {
            throw new Error('Invalid FAQ ID');
        }

        const update = helpful
            ? { $inc: { helpfulCount: 1 } }
            : { $inc: { notHelpfulCount: 1 } };

        const faq = await FAQ.findByIdAndUpdate(faqId, update, { new: true });

        if (!faq) {
            throw new Error('FAQ not found');
        }

        return faq;
    }

    static async updateFAQ(faqId: string, data: Partial<CreateFAQDTO & { isPublished: boolean }>): Promise<IFAQ> {
        if (!mongoose.Types.ObjectId.isValid(faqId)) {
            throw new Error('Invalid FAQ ID');
        }

        const faq = await FAQ.findByIdAndUpdate(faqId, data, { new: true, runValidators: true });

        if (!faq) {
            throw new Error('FAQ not found');
        }

        return faq;
    }

    static async deleteFAQ(faqId: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(faqId)) {
            throw new Error('Invalid FAQ ID');
        }

        await FAQ.findByIdAndDelete(faqId);
    }

    static async getAllFAQsAdmin(): Promise<IFAQ[]> {
        return await FAQ.find().sort({ category: 1, order: 1 });
    }
}