import { Product } from '../product/product.model';
import { AnalyticsEvent } from '../analytics/analytics.model';
import { SearchProductsDTO, AutocompleteDTO } from './search.dto';
import mongoose from 'mongoose';

export class SearchService {
    static async searchProducts(dto: SearchProductsDTO): Promise<{
        products: unknown[];
        facets: {
            categories: { name: string; count: number }[];
            priceRange: { min: number; max: number };
            ratings: { rating: number; count: number }[];
            tags: { name: string; count: number }[];
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const skip = (page - 1) * limit;

        const matchQuery: {
            isActive?: boolean;
            $text?: { $search: string };
            category?: string;
            price?: { $gte?: number; $lte?: number };
            rating?: { $gte: number };
            stock?: { $gt: number };
            tags?: { $in: string[] };
        } = { isActive: true };

        if (dto.query) {
            matchQuery.$text = { $search: dto.query };
        }

        if (dto.category) {
            matchQuery.category = dto.category;
        }

        if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
            matchQuery.price = {};
            if (dto.minPrice !== undefined) matchQuery.price.$gte = dto.minPrice;
            if (dto.maxPrice !== undefined) matchQuery.price.$lte = dto.maxPrice;
        }

        if (dto.minRating !== undefined) {
            matchQuery.rating = { $gte: dto.minRating };
        }

        if (dto.inStock) {
            matchQuery.stock = { $gt: 0 };
        }

        if (dto.tags && dto.tags.length > 0) {
            matchQuery.tags = { $in: dto.tags };
        }

        let sort: { [key: string]: 1 | -1 | { $meta: string } } = {};
        const projection: { score?: { $meta: string } } = {};

        if (dto.query) {
            projection.score = { $meta: 'textScore' };
        }

        switch (dto.sortBy) {
            case 'relevance':
                sort = dto.query ? { score: { $meta: 'textScore' } } : { createdAt: -1 };
                break;
            case 'price_asc':
                sort = { price: 1 };
                break;
            case 'price_desc':
                sort = { price: -1 };
                break;
            case 'rating':
                sort = { rating: -1, numReviews: -1 };
                break;
            case 'popularity':
                sort = { numReviews: -1, rating: -1 };
                break;
            case 'newest':
            default:
                sort = { createdAt: -1 };
        }

        const [products, total, facets] = await Promise.all([
            Product.find(matchQuery, projection)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(matchQuery),
            this.getFacets(matchQuery),
        ]);

        if (dto.query) {
            AnalyticsEvent.create({
                eventType: 'search',
                metadata: { searchQuery: dto.query, resultsCount: total },
            }).catch(err => console.error('Failed to track search:', err));
        }

        return {
            products,
            facets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    private static async getFacets(baseQuery: { isActive?: boolean; category?: string; price?: { $gte?: number; $lte?: number }; rating?: { $gte: number }; tags?: { $in: string[] } }): Promise<{
        categories: { name: string; count: number }[];
        priceRange: { min: number; max: number };
        ratings: { rating: number; count: number }[];
        tags: { name: string; count: number }[];
    }> {
        const { category, ...queryWithoutCategory } = baseQuery;
        const { price, ...queryWithoutPrice } = baseQuery;
        const { rating, ...queryWithoutRating } = baseQuery;
        const { tags, ...queryWithoutTags } = baseQuery;

        const [categoryFacets, priceRangeFacet, ratingFacets, tagFacets] = await Promise.all([
            Product.aggregate([
                { $match: queryWithoutCategory },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 20 },
            ]),
            Product.aggregate([
                { $match: queryWithoutPrice },
                { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
            ]),
            Product.aggregate([
                { $match: queryWithoutRating },
                { $bucket: {
                        groupBy: '$rating',
                        boundaries: [0, 1, 2, 3, 4, 5, 6],
                        default: 'other',
                        output: { count: { $sum: 1 } },
                    }},
            ]),
            Product.aggregate([
                { $match: queryWithoutTags },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 15 },
            ]),
        ]);

        return {
            categories: categoryFacets.map(c => ({ name: c._id, count: c.count })),
            priceRange: {
                min: priceRangeFacet[0]?.min || 0,
                max: priceRangeFacet[0]?.max || 0,
            },
            ratings: ratingFacets
                .filter(r => r._id !== 'other')
                .map(r => ({ rating: r._id, count: r.count }))
                .reverse(),
            tags: tagFacets.map(t => ({ name: t._id, count: t.count })),
        };
    }

    static async autocomplete(dto: AutocompleteDTO): Promise<{
        suggestions: { _id: string; name: string; category: string; price: number; image?: string }[];
        categories: string[];
    }> {
        const regex = new RegExp(`^${this.escapeRegex(dto.query)}`, 'i');
        const containsRegex = new RegExp(this.escapeRegex(dto.query), 'i');

        const [productMatches, categoryMatches] = await Promise.all([
            Product.aggregate([
                {
                    $match: {
                        isActive: true,
                        $or: [
                            { name: regex },
                            { name: containsRegex },
                        ],
                    },
                },
                {
                    $addFields: {
                        matchPriority: {
                            $cond: [{ $regexMatch: { input: '$name', regex } }, 1, 2],
                        },
                    },
                },
                { $sort: { matchPriority: 1, numReviews: -1 } },
                { $limit: dto.limit || 5 },
                {
                    $project: {
                        name: 1,
                        category: 1,
                        price: 1,
                        images: { $arrayElemAt: ['$images', 0] },
                    },
                },
            ]),
            Product.distinct('category', {
                isActive: true,
                category: containsRegex,
            }),
        ]);

        return {
            suggestions: productMatches.map(p => ({
                _id: p._id.toString(),
                name: p.name,
                category: p.category,
                price: p.price,
                image: p.images,
            })),
            categories: categoryMatches.slice(0, 5),
        };
    }

    static async getTrendingSearches(limit: number = 10): Promise<{ query: string; count: number }[]> {
        const dateThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const results = await AnalyticsEvent.aggregate([
            {
                $match: {
                    eventType: 'search',
                    createdAt: { $gte: dateThreshold },
                    'metadata.searchQuery': { $exists: true, $ne: '' },
                },
            },
            {
                $group: {
                    _id: { $toLower: '$metadata.searchQuery' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: limit },
        ]);

        return results.map(r => ({ query: r._id, count: r.count }));
    }

    static async getSimilarProducts(productId: string, limit: number = 6): Promise<unknown[]> {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        return await Product.find({
            _id: { $ne: productId },
            isActive: true,
            $or: [
                { category: product.category },
                { tags: { $in: product.tags || [] } },
            ],
        })
            .sort({ rating: -1, numReviews: -1 })
            .limit(limit)
            .lean();
    }

    private static escapeRegex(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}