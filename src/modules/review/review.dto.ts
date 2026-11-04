export interface CreateReviewDTO {
    productId: string;
    rating: number;
    title: string;
    comment: string;
    orderId?: string;
}

export interface UpdateReviewDTO {
    rating?: number;
    title?: string;
    comment?: string;
}

export interface ReviewQueryDTO {
    page?: number;
    limit?: number;
    rating?: number;
    minRating?: number;
    verified?: boolean;
    sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
}

export interface VoteReviewDTO {
    helpful: boolean;
}

export interface RespondToReviewDTO {
    text: string;
}

export const validateCreateReview = (dto: CreateReviewDTO): CreateReviewDTO => {
    const errors: string[] = [];

    if (!dto.productId || typeof dto.productId !== 'string') {
        errors.push('Valid product ID is required');
    }

    const rating = Number(dto.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
        errors.push('Rating must be between 1 and 5');
    }

    if (!dto.title || typeof dto.title !== 'string' || dto.title.trim().length < 3) {
        errors.push('Review title must be at least 3 characters');
    }

    if (dto.title && dto.title.length > 100) {
        errors.push('Review title cannot exceed 100 characters');
    }

    if (!dto.comment || typeof dto.comment !== 'string' || dto.comment.trim().length < 10) {
        errors.push('Review comment must be at least 10 characters');
    }

    if (dto.comment && dto.comment.length > 1000) {
        errors.push('Review comment cannot exceed 1000 characters');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        productId: dto.productId,
        rating: Number(dto.rating),
        title: dto.title.trim(),
        comment: dto.comment.trim(),
        orderId: dto.orderId,
    };
};

export const validateUpdateReview = (dto: UpdateReviewDTO): UpdateReviewDTO => {
    const validated: UpdateReviewDTO = {};

    if (dto.rating !== undefined) {
        const rating = Number(dto.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }
        validated.rating = rating;
    }

    if (dto.title !== undefined) {
        if (typeof dto.title !== 'string' || dto.title.trim().length < 3) {
            throw new Error('Review title must be at least 3 characters');
        }
        if (dto.title.length > 100) {
            throw new Error('Review title cannot exceed 100 characters');
        }
        validated.title = dto.title.trim();
    }

    if (dto.comment !== undefined) {
        if (typeof dto.comment !== 'string' || dto.comment.trim().length < 10) {
            throw new Error('Review comment must be at least 10 characters');
        }
        if (dto.comment.length > 1000) {
            throw new Error('Review comment cannot exceed 1000 characters');
        }
        validated.comment = dto.comment.trim();
    }

    return validated;
};

export const validateRespondToReview = (dto: RespondToReviewDTO): RespondToReviewDTO => {
    if (!dto.text || typeof dto.text !== 'string' || dto.text.trim().length < 10) {
        throw new Error('Response must be at least 10 characters');
    }

    if (dto.text.length > 500) {
        throw new Error('Response cannot exceed 500 characters');
    }

    return {
        text: dto.text.trim(),
    };
};