export interface AddToCartDTO {
    productId: string;
    quantity: number;
}

export interface UpdateCartItemDTO {
    quantity: number;
}

export const validateAddToCart = (dto: AddToCartDTO): AddToCartDTO => {
    if (!dto.productId || typeof dto.productId !== 'string') {
        throw new Error('Valid product ID is required');
    }

    const quantity = Number(dto.quantity);
    if (isNaN(quantity) || quantity < 1 || quantity > 100) {
        throw new Error('Quantity must be between 1 and 100');
    }

    return { productId: dto.productId, quantity };
};

export const validateUpdateCartItem = (dto: UpdateCartItemDTO): UpdateCartItemDTO => {
    const quantity = Number(dto.quantity);
    if (isNaN(quantity) || quantity < 0 || quantity > 100) {
        throw new Error('Quantity must be between 0 and 100');
    }

    return { quantity };
};