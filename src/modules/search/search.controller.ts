import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { SearchService } from './search.service';
import { validateSearchProducts, validateAutocomplete, SearchProductsDTO, AutocompleteDTO } from './search.dto';

export const searchProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = validateSearchProducts(req.query as unknown as SearchProductsDTO);
    const result = await SearchService.searchProducts(dto);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const autocomplete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = validateAutocomplete(req.query as unknown as AutocompleteDTO);
    const result = await SearchService.autocomplete(dto);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const getTrendingSearches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const trending = await SearchService.getTrendingSearches(limit);

    res.status(200).json({
        success: true,
        trending,
    });
});

export const getSimilarProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }
    const limit = req.query.limit ? Number(req.query.limit) : 6;

    const products = await SearchService.getSimilarProducts(productId, limit);

    res.status(200).json({
        success: true,
        count: products.length,
        products,
    });
});