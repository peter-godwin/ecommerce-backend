export interface SearchProductsDTO {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
    tags?: string[];
    sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popularity';
    page?: number;
    limit?: number;
}

export interface AutocompleteDTO {
    query: string;
    limit?: number;
}

export const validateSearchProducts = (query: SearchProductsDTO): SearchProductsDTO => {
    const dto: SearchProductsDTO = {};

    if (query.query && typeof query.query === 'string') {
        dto.query = query.query.trim();
    }

    if (query.category && typeof query.category === 'string') {
        dto.category = query.category.trim().toLowerCase();
    }

    if (query.minPrice !== undefined) {
        const val = Number(query.minPrice);
        if (!isNaN(val) && val >= 0) dto.minPrice = val;
    }

    if (query.maxPrice !== undefined) {
        const val = Number(query.maxPrice);
        if (!isNaN(val) && val >= 0) dto.maxPrice = val;
    }

    if (query.minRating !== undefined) {
        const val = Number(query.minRating);
        if (!isNaN(val) && val >= 0 && val <= 5) dto.minRating = val;
    }

    if (query.inStock !== undefined) {
        dto.inStock = Boolean(query.inStock);
    }

    if (query.tags) {
        dto.tags = Array.isArray(query.tags)
            ? query.tags
            : String(query.tags).split(',').map((t: string) => t.trim());
    }

    const validSortOptions = ['relevance', 'price_asc', 'price_desc', 'rating', 'newest', 'popularity'];
    if (query.sortBy && validSortOptions.includes(query.sortBy)) {
        dto.sortBy = query.sortBy;
    } else {
        dto.sortBy = dto.query ? 'relevance' : 'newest';
    }

    dto.page = Math.max(1, Number(query.page) || 1);
    dto.limit = Math.min(50, Math.max(1, Number(query.limit) || 20));

    return dto;
};

export const validateAutocomplete = (query: AutocompleteDTO): AutocompleteDTO => {
    if (!query.query || typeof query.query !== 'string' || query.query.trim().length < 1) {
        throw new Error('Search query is required');
    }

    return {
        query: query.query.trim(),
        limit: Math.min(10, Math.max(1, Number(query.limit) || 5)),
    };
};