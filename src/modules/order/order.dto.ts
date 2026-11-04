export interface CreateOrderDTO {
    items: {
        productId: string;
        quantity: number;
    }[];
    shippingAddress: string;
    paymentMethod?: string;
    notes?: string;
    giftCardCode?: string;
}

export interface UpdateOrderStatusDTO {
    status: string;
    trackingNumber?: string;
    notes?: string;
}

export const validateCreateOrder = (dto: CreateOrderDTO): CreateOrderDTO => {
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
        throw new Error('Order must have at least one item');
    }

    if (dto.items.length > 50) {
        throw new Error('Maximum 50 items per order');
    }

    for (const item of dto.items) {
        if (!item.productId || typeof item.productId !== 'string') {
            throw new Error('Valid product ID is required for all items');
        }

        const quantity = Number(item.quantity);
        if (isNaN(quantity) || quantity < 1 || quantity > 100) {
            throw new Error('Quantity must be between 1 and 100 per item');
        }
    }

    if (!dto.shippingAddress || typeof dto.shippingAddress !== 'string' || dto.shippingAddress.length < 10) {
        throw new Error('Valid shipping address is required (minimum 10 characters)');
    }

    return {
        items: dto.items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity)
        })),
        shippingAddress: dto.shippingAddress.trim(),
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        giftCardCode: dto.giftCardCode ? String(dto.giftCardCode).trim().toUpperCase() : undefined, // ✨ NEW
    };
};

export const validateUpdateStatus = (dto: UpdateOrderStatusDTO): UpdateOrderStatusDTO => {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!dto.status || !validStatuses.includes(dto.status)) {
        throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    return {
        status: dto.status,
        trackingNumber: dto.trackingNumber,
        notes: dto.notes,
    };
};