export interface CreateTicketDTO {
    subject: string;
    message: string;
    category: string;
    priority?: string;
    relatedOrder?: string;
    relatedProduct?: string;
    attachments?: string[];
}

export interface AddMessageDTO {
    message: string;
    attachments?: string[];
    isInternal?: boolean;
}

export interface UpdateTicketDTO {
    status?: string;
    priority?: string;
    assignedTo?: string;
}

export interface RateTicketDTO {
    rating: number;
    feedback?: string;
}

export interface CreateFAQDTO {
    question: string;
    answer: string;
    category: string;
    tags?: string[];
    order?: number;
}

const VALID_CATEGORIES = [
    'order_issue', 'payment_issue', 'shipping_issue', 'product_question',
    'return_refund', 'account_issue', 'technical_issue', 'other',
];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['open', 'in_progress', 'awaiting_customer', 'resolved', 'closed'];
const VALID_FAQ_CATEGORIES = ['orders', 'shipping', 'returns', 'payments', 'account', 'products', 'general'];

export const validateCreateTicket = (dto: CreateTicketDTO): CreateTicketDTO => {
    const errors: string[] = [];

    if (!dto.subject || typeof dto.subject !== 'string' || dto.subject.trim().length < 5) {
        errors.push('Subject must be at least 5 characters');
    }

    if (!dto.message || typeof dto.message !== 'string' || dto.message.trim().length < 10) {
        errors.push('Message must be at least 10 characters');
    }

    if (!dto.category || !VALID_CATEGORIES.includes(dto.category)) {
        errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (dto.priority && !VALID_PRIORITIES.includes(dto.priority)) {
        errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        category: dto.category,
        priority: dto.priority || 'medium',
        relatedOrder: dto.relatedOrder,
        relatedProduct: dto.relatedProduct,
        attachments: dto.attachments || [],
    };
};

export const validateAddMessage = (dto: AddMessageDTO): AddMessageDTO => {
    if (!dto.message || typeof dto.message !== 'string' || dto.message.trim().length < 1) {
        throw new Error('Message cannot be empty');
    }

    if (dto.message.length > 5000) {
        throw new Error('Message cannot exceed 5000 characters');
    }

    return {
        message: dto.message.trim(),
        attachments: dto.attachments || [],
        isInternal: Boolean(dto.isInternal),
    };
};

export const validateUpdateTicket = (dto: UpdateTicketDTO): UpdateTicketDTO => {
    const validated: UpdateTicketDTO = {};

    if (dto.status !== undefined) {
        if (!VALID_STATUSES.includes(dto.status)) {
            throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        validated.status = dto.status;
    }

    if (dto.priority !== undefined) {
        if (!VALID_PRIORITIES.includes(dto.priority)) {
            throw new Error(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
        }
        validated.priority = dto.priority;
    }

    if (dto.assignedTo !== undefined) {
        validated.assignedTo = dto.assignedTo;
    }

    return validated;
};

export const validateRateTicket = (dto: RateTicketDTO): RateTicketDTO => {
    const rating = Number(dto.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
    }

    return {
        rating,
        feedback: dto.feedback?.trim(),
    };
};

export const validateCreateFAQ = (dto: CreateFAQDTO): CreateFAQDTO => {
    const errors: string[] = [];

    if (!dto.question || typeof dto.question !== 'string' || dto.question.trim().length < 5) {
        errors.push('Question must be at least 5 characters');
    }

    if (!dto.answer || typeof dto.answer !== 'string' || dto.answer.trim().length < 10) {
        errors.push('Answer must be at least 10 characters');
    }

    if (!dto.category || !VALID_FAQ_CATEGORIES.includes(dto.category)) {
        errors.push(`Category must be one of: ${VALID_FAQ_CATEGORIES.join(', ')}`);
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        question: dto.question.trim(),
        answer: dto.answer.trim(),
        category: dto.category,
        tags: dto.tags || [],
        order: dto.order !== undefined ? Number(dto.order) : 0,
    };
};