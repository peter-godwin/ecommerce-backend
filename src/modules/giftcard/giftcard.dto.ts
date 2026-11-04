export interface PurchaseGiftCardDTO {
    amount: number;
    recipientEmail: string;
    recipientName?: string;
    senderName?: string;
    message?: string;
    isGift?: boolean;
    deliveryDate?: Date;
}

export interface RedeemGiftCardDTO {
    code: string;
}

export interface AdjustBalanceDTO {
    amount: number;
    note: string;
}

export interface IssuePromoGiftCardDTO {
    amount: number;
    recipientEmail: string;
    recipientName?: string;
    message?: string;
    expiresInDays?: number;
}

export const validatePurchaseGiftCard = (dto: PurchaseGiftCardDTO): PurchaseGiftCardDTO => {
    const errors: string[] = [];

    const amount = Number(dto.amount);
    if (isNaN(amount) || amount < 5 || amount > 2000) {
        errors.push('Gift card amount must be between $5 and $2000');
    }

    if (!dto.recipientEmail || typeof dto.recipientEmail !== 'string') {
        errors.push('Recipient email is required');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(dto.recipientEmail)) {
            errors.push('Invalid recipient email');
        }
    }

    if (dto.message && dto.message.length > 300) {
        errors.push('Message cannot exceed 300 characters');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        amount,
        recipientEmail: dto.recipientEmail.trim().toLowerCase(),
        recipientName: dto.recipientName?.trim(),
        senderName: dto.senderName?.trim(),
        message: dto.message?.trim(),
        isGift: Boolean(dto.isGift),
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
    };
};

export const validateRedeemGiftCard = (dto: RedeemGiftCardDTO): RedeemGiftCardDTO => {
    if (!dto.code || typeof dto.code !== 'string') {
        throw new Error('Gift card code is required');
    }

    return { code: dto.code.trim().toUpperCase() };
};

export const validateAdjustBalance = (dto: AdjustBalanceDTO): AdjustBalanceDTO => {
    const amount = Number(dto.amount);
    if (isNaN(amount) || amount === 0) {
        throw new Error('Amount must be a non-zero number');
    }

    if (!dto.note || typeof dto.note !== 'string' || dto.note.trim().length < 3) {
        throw new Error('A note is required for balance adjustments (min 3 characters)');
    }

    return { amount, note: dto.note.trim() };
};

export const validateIssuePromoGiftCard = (dto: IssuePromoGiftCardDTO): IssuePromoGiftCardDTO => {
    const errors: string[] = [];

    const amount = Number(dto.amount);
    if (isNaN(amount) || amount < 1) {
        errors.push('Amount must be a positive number');
    }

    if (!dto.recipientEmail || typeof dto.recipientEmail !== 'string') {
        errors.push('Recipient email is required');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        amount,
        recipientEmail: dto.recipientEmail.trim().toLowerCase(),
        recipientName: dto.recipientName?.trim(),
        message: dto.message?.trim(),
        expiresInDays: dto.expiresInDays ? Number(dto.expiresInDays) : undefined,
    };
};