import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { ProductService } from './product.service';
import { validateCreateProduct, validateUpdateProduct, ProductQueryDTO } from './product.dto';

export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: ProductQueryDTO = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        category: req.query.category as string,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        order: req.query.order as 'asc' | 'desc',
        inStock: req.query.inStock === 'true',
    };

    const result = await ProductService.getAllProducts(query);

    res.status(200).json({
        success: true,
        ...result
    });
});

export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }

    const product = await ProductService.getProductById(id);

    if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
    }

    res.status(200).json({ success: true, product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = validateCreateProduct(req.body);
    const product = await ProductService.createProduct(dto);

    res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product
    });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }

    const dto = validateUpdateProduct(req.body);
    const product = await ProductService.updateProduct(id, dto);

    if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        product
    });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }

    const product = await ProductService.getProductById(id);

    if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
    }

    await ProductService.deleteProduct(id);

    res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
    });
});

export const getCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const categories = await ProductService.getCategories();

    res.status(200).json({
        success: true,
        categories
    });
});

export const getLowStockProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const threshold = req.query.threshold ? Number(req.query.threshold) : 10;
    const products = await ProductService.getLowStockProducts(threshold);

    res.status(200).json({
        success: true,
        count: products.length,
        products
    });
});

export const getProductStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await ProductService.getProductStats();

    res.status(200).json({
        success: true,
        stats
    });
});