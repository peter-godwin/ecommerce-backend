export interface CreatePaymentIntentDTO {
    orderId: string;
    amount: number;
    currency?: string;
    paymentMethod?: 'card' | 'bank_transfer';
}

export interface ConfirmPaymentDTO {
    paymentIntentId: string;
}

export interface SavePaymentMethodDTO {
    paymentMethodId: string;
}

export const validateSavePaymentMethod = (dto: SavePaymentMethodDTO): SavePaymentMethodDTO => {
    if (!dto.paymentMethodId || typeof dto.paymentMethodId !== 'string') {
        throw new Error('Valid payment method ID is required');
    }

    return { paymentMethodId: dto.paymentMethodId };
};

export interface RefundPaymentDTO {
    paymentId: string;
    amount?: number;
    reason?: string;
}

export interface PaymentResponseDTO {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    clientSecret?: string;
    paymentMethod: string;
    createdAt: Date;
}

export const validateCreatePaymentIntent = (dto: CreatePaymentIntentDTO): CreatePaymentIntentDTO => {
    if (!dto.orderId || typeof dto.orderId !== 'string') {
        throw new Error('Valid order ID is required');
    }

    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }

    return {
        orderId: dto.orderId,
        amount,
        currency: dto.currency || 'usd',
        paymentMethod: dto.paymentMethod || 'card',
    };
};