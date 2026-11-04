export interface AddToWishlistDTO {
    productId: string;
}

export interface MoveToCartDTO {
    productId: string;
    quantity?: number;
}

export const validateAddToWishlist = (dto: AddToWishlistDTO): AddToWishlistDTO => {
    if (!dto.productId || typeof dto.productId !== 'string') {
        throw new Error('Valid product ID is required');
    }

    return {
        productId: dto.productId,
    };
};

export const validateMoveToCart = (dto: MoveToCartDTO): MoveToCartDTO => {
    if (!dto.productId || typeof dto.productId !== 'string') {
        throw new Error('Valid product ID is required');
    }

    const quantity = dto.quantity ? Number(dto.quantity) : 1;

    if (isNaN(quantity) || quantity < 1 || quantity > 100) {
        throw new Error('Quantity must be between 1 and 100');
    }

    return {
        productId: dto.productId,
        quantity,
    };
};