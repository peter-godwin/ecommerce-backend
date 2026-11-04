import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { SupportService } from './support.service';
import { TicketStatus } from './ticket.model';
import {
    validateCreateTicket,
    validateAddMessage,
    validateUpdateTicket,
    validateRateTicket,
    validateCreateFAQ,
} from './support.dto';


export const createTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateCreateTicket(req.body);
    const ticket = await SupportService.createTicket(
        req.user._id.toString(),
        req.user.email,
        dto
    );

    res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        ticket,
    });
});

export const getUserTickets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const filters: {
        status?: TicketStatus;
        page?: number;
        limit?: number;
    } = {
        status: req.query.status as TicketStatus,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await SupportService.getUserTickets(req.user._id.toString(), filters);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const getTicketById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
    }
    const isAdmin = req.user.role === 'admin';

    const ticket = await SupportService.getTicketById(id, req.user._id.toString(), isAdmin);

    res.status(200).json({
        success: true,
        ticket,
    });
});

export const addMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
    }
    const isAdmin = req.user.role === 'admin';
    const dto = validateAddMessage(req.body);

    const ticket = await SupportService.addMessage(
        id,
        req.user._id.toString(),
        isAdmin ? 'admin' : 'customer',
        isAdmin,
        dto
    );

    res.status(200).json({
        success: true,
        message: 'Reply added successfully',
        ticket,
    });
});

export const rateTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
    }
    const dto = validateRateTicket(req.body);

    const ticket = await SupportService.rateTicket(id, req.user._id.toString(), dto);

    res.status(200).json({
        success: true,
        message: 'Thank you for your feedback!',
        ticket,
    });
});


export const getAllTickets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = {
        status: req.query.status as TicketStatus,
        priority: req.query.priority as string,
        category: req.query.category as string,
        assignedTo: req.query.assignedTo as string,
        unassigned: req.query.unassigned === 'true',
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await SupportService.getAllTickets(filters);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const updateTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
    }
    const dto = validateUpdateTicket(req.body);

    const ticket = await SupportService.updateTicket(id, dto);

    res.status(200).json({
        success: true,
        message: 'Ticket updated successfully',
        ticket,
    });
});

export const getSupportStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await SupportService.getSupportStats();

    res.status(200).json({
        success: true,
        stats,
    });
});


export const getFAQs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = {
        category: req.query.category as string,
        query: req.query.query as string,
    };

    const faqs = await SupportService.getFAQs(filters);

    res.status(200).json({
        success: true,
        count: faqs.length,
        faqs,
    });
});

export const getFAQById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid FAQ ID' });
        return;
    }
    const faq = await SupportService.getFAQById(id);

    res.status(200).json({
        success: true,
        faq,
    });
});

export const voteFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid FAQ ID' });
        return;
    }
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
        res.status(400).json({ success: false, message: 'helpful must be a boolean' });
        return;
    }

    const faq = await SupportService.voteFAQ(id, helpful);

    res.status(200).json({
        success: true,
        message: 'Thanks for your feedback!',
        faq,
    });
});


export const createFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = validateCreateFAQ(req.body);
    const faq = await SupportService.createFAQ(dto);

    res.status(201).json({
        success: true,
        message: 'FAQ created successfully',
        faq,
    });
});

export const getAllFAQsAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const faqs = await SupportService.getAllFAQsAdmin();

    res.status(200).json({
        success: true,
        count: faqs.length,
        faqs,
    });
});

export const updateFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid FAQ ID' });
        return;
    }
    const faq = await SupportService.updateFAQ(id, req.body);

    res.status(200).json({
        success: true,
        message: 'FAQ updated successfully',
        faq,
    });
});

export const deleteFAQ = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid FAQ ID' });
        return;
    }
    await SupportService.deleteFAQ(id);

    res.status(200).json({
        success: true,
        message: 'FAQ deleted successfully',
    });
});