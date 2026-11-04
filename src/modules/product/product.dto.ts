export interface CreateProductDTO {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    sku?: string;
    images?: string[];
    discount?: number;
    tags?: string[];
}

export interface UpdateProductDTO {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    stock?: number;
    sku?: string;
    images?: string[];
    isActive?: boolean;
    discount?: number;
    tags?: string[];
}

export interface ProductQueryDTO {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    inStock?: boolean;
}

export const validateCreateProduct = (dto: CreateProductDTO): CreateProductDTO => {
    const errors: string[] = [];

    if (!dto.name || typeof dto.name !== 'string' || dto.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters');
    }

    if (!dto.description || typeof dto.description !== 'string' || dto.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters');
    }

    const price = Number(dto.price);
    if (isNaN(price) || price < 0) {
        errors.push('Price must be a positive number');
    }

    if (!dto.category || typeof dto.category !== 'string') {
        errors.push('Valid category is required');
    }

    const stock = Number(dto.stock);
    if (isNaN(stock) || stock < 0) {
        errors.push('Stock must be a non-negative number');
    }

    if (dto.discount !== undefined) {
        const discount = Number(dto.discount);
        if (isNaN(discount) || discount < 0 || discount > 100) {
            errors.push('Discount must be between 0 and 100');
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return {
        name: dto.name.trim(),
        description: dto.description.trim(),
        price: Number(dto.price),
        category: dto.category.trim().toLowerCase(),
        stock: Number(dto.stock),
        sku: dto.sku?.trim().toUpperCase(),
        images: dto.images || [],
        discount: dto.discount ? Number(dto.discount) : 0,
        tags: dto.tags || [],
    };
};

export const validateUpdateProduct = (dto: UpdateProductDTO): UpdateProductDTO => {
    const validated: UpdateProductDTO = {};

    if (dto.name !== undefined) {
        if (typeof dto.name !== 'string' || dto.name.trim().length < 3) {
            throw new Error('Name must be at least 3 characters');
        }
        validated.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
        if (typeof dto.description !== 'string' || dto.description.trim().length < 10) {
            throw new Error('Description must be at least 10 characters');
        }
        validated.description = dto.description.trim();
    }

    if (dto.price !== undefined) {
        const price = Number(dto.price);
        if (isNaN(price) || price < 0) {
            throw new Error('Price must be a positive number');
        }
        validated.price = price;
    }

    if (dto.stock !== undefined) {
        const stock = Number(dto.stock);
        if (isNaN(stock) || stock < 0) {
            throw new Error('Stock must be a non-negative number');
        }
        validated.stock = stock;
    }

    if (dto.category !== undefined) {
        validated.category = dto.category.trim().toLowerCase();
    }

    if (dto.discount !== undefined) {
        const discount = Number(dto.discount);
        if (isNaN(discount) || discount < 0 || discount > 100) {
            throw new Error('Discount must be between 0 and 100');
        }
        validated.discount = discount;
    }

    if (dto.sku !== undefined) {
        validated.sku = dto.sku.trim().toUpperCase();
    }

    if (dto.images !== undefined) {
        validated.images = dto.images;
    }

    if (dto.isActive !== undefined) {
        validated.isActive = Boolean(dto.isActive);
    }

    if (dto.tags !== undefined) {
        validated.tags = dto.tags;
    }

    return validated;
};