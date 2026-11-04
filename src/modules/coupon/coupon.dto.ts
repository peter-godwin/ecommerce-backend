export interface CreateCouponDTO {
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed' | 'free_shipping';
    discountValue: number;
    minOrderValue?: number;
    maxDiscount?: number;
    maxUses?: number;
    maxUsesPerUser?: number;
    validFrom: Date;
    validUntil: Date;
    isPublic?: boolean;
    applicableProducts?: string[];
    applicableCategories?: string[];
}

export interface UpdateCouponDTO {
    description?: string;
    discountValue?: number;
    minOrderValue?: number;
    maxDiscount?: number;
    maxUses?: number;
    maxUsesPerUser?: number;
    validFrom?: Date;
    validUntil?: Date;
    status?: 'active' | 'inactive' | 'expired';
    isPublic?: boolean;
    applicableProducts?: string[];
    applicableCategories?: string[];
}

export interface ApplyCouponDTO {
    code: string;
    cartTotal: number;
    cartItems?: {
        productId: string;
        quantity: number;
        price: number;
    }[];
}

export interface CouponQueryDTO {
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive' | 'expired';
    discountType?: 'percentage' | 'fixed' | 'free_shipping';
    isPublic?: boolean;
}

export const validateCreateCoupon = (dto: CreateCouponDTO): CreateCouponDTO => {
    const errors: string[] = [];

    if (!dto.code || typeof dto.code !== 'string' || dto.code.trim().length < 3) {
        errors.push('Coupon code must be at least 3 characters');
    }

    if (!dto.description || typeof dto.description !== 'string') {
        errors.push('Description is required');
    }

    if (!['percentage', 'fixed', 'free_shipping'].includes(dto.discountType)) {
        errors.push('Invalid discount type');
    }

    const discountValue = Number(dto.discountValue);
    if (isNaN(discountValue) || discountValue < 0) {
        errors.push('Discount value must be a positive number');
    }

    if (dto.discountType === 'percentage' && discountValue > 100) {
        errors.push('Percentage discount cannot exceed 100%');
    }

    if (!dto.validFrom || !dto.validUntil) {
        errors.push('Valid from and valid until dates are required');
    }

    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);

    if (validFrom >= validUntil) {
        errors.push('Valid until date must be after valid from date');
    }

    if (dto.minOrderValue !== undefined) {
        const minOrderValue = Number(dto.minOrderValue);
        if (isNaN(minOrderValue) || minOrderValue < 0) {
            errors.push('Minimum order value must be a positive number');
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        code: dto.code.trim().toUpperCase(),
        description: dto.description.trim(),
        discountType: dto.discountType,
        discountValue: Number(dto.discountValue),
        minOrderValue: dto.minOrderValue ? Number(dto.minOrderValue) : undefined,
        maxDiscount: dto.maxDiscount ? Number(dto.maxDiscount) : undefined,
        maxUses: dto.maxUses ? Number(dto.maxUses) : undefined,
        maxUsesPerUser: dto.maxUsesPerUser ? Number(dto.maxUsesPerUser) : 1,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        isPublic: dto.isPublic !== undefined ? Boolean(dto.isPublic) : true,
        applicableProducts: dto.applicableProducts,
        applicableCategories: dto.applicableCategories,
    };
};

export const validateUpdateCoupon = (dto: UpdateCouponDTO): UpdateCouponDTO => {
    const validated: UpdateCouponDTO = {};

    if (dto.description !== undefined) {
        validated.description = dto.description.trim();
    }

    if (dto.discountValue !== undefined) {
        const discountValue = Number(dto.discountValue);
        if (isNaN(discountValue) || discountValue < 0) {
            throw new Error('Discount value must be a positive number');
        }
        validated.discountValue = discountValue;
    }

    if (dto.minOrderValue !== undefined) {
        validated.minOrderValue = Number(dto.minOrderValue);
    }

    if (dto.maxDiscount !== undefined) {
        validated.maxDiscount = Number(dto.maxDiscount);
    }

    if (dto.maxUses !== undefined) {
        validated.maxUses = Number(dto.maxUses);
    }

    if (dto.maxUsesPerUser !== undefined) {
        validated.maxUsesPerUser = Number(dto.maxUsesPerUser);
    }

    if (dto.validFrom !== undefined) {
        validated.validFrom = new Date(dto.validFrom);
    }

    if (dto.validUntil !== undefined) {
        validated.validUntil = new Date(dto.validUntil);
    }

    if (dto.status !== undefined) {
        if (!['active', 'inactive', 'expired'].includes(dto.status)) {
            throw new Error('Invalid status');
        }
        validated.status = dto.status;
    }

    if (dto.isPublic !== undefined) {
        validated.isPublic = Boolean(dto.isPublic);
    }

    if (dto.applicableProducts !== undefined) {
        validated.applicableProducts = dto.applicableProducts;
    }

    if (dto.applicableCategories !== undefined) {
        validated.applicableCategories = dto.applicableCategories;
    }

    return validated;
};