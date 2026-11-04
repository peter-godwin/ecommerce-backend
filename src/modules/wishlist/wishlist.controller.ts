import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { WishlistService } from './wishlist.service';
import { validateAddToWishlist, validateMoveToCart } from './wishlist.dto';

export const getWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const wishlist = await WishlistService.getWishlist(req.user._id.toString());

    res.status(200).json({
        success: true,
        wishlist,
        itemCount: wishlist.items.length,
    });
});

export const addToWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateAddToWishlist(req.body);
    const wishlist = await WishlistService.addToWishlist(req.user._id.toString(), dto);

    res.status(200).json({
        success: true,
        message: 'Product added to wishlist',
        wishlist,
        itemCount: wishlist.items.length,
    });
});

export const removeFromWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { productId } = req.params;
    if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }
    const wishlist = await WishlistService.removeFromWishlist(req.user._id.toString(), productId);

    res.status(200).json({
        success: true,
        message: 'Product removed from wishlist',
        wishlist,
        itemCount: wishlist.items.length,
    });
});

export const clearWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    await WishlistService.clearWishlist(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: 'Wishlist cleared',
    });
});

export const moveToCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateMoveToCart(req.body);
    const result = await WishlistService.moveToCart(req.user._id.toString(), dto);

    res.status(200).json({
        success: true,
        message: 'Product moved to cart',
        ...result,
    });
});

export const checkWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { productId } = req.params;
    if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }
    const isInWishlist = await WishlistService.isInWishlist(req.user._id.toString(), productId);

    res.status(200).json({
        success: true,
        isInWishlist,
    });
});

export const togglePublicStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const wishlist = await WishlistService.togglePublicStatus(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: wishlist.isPublic ? 'Wishlist is now public' : 'Wishlist is now private',
        wishlist,
    });
});

export const getPublicWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    if (typeof userId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
    }
    const wishlist = await WishlistService.getPublicWishlist(userId);

    if (!wishlist) {
        res.status(404).json({ success: false, message: 'Wishlist not found or is private' });
        return;
    }

    res.status(200).json({
        success: true,
        wishlist,
        itemCount: wishlist.items.length,
    });
});

export const getMostWishlisted = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const products = await WishlistService.getMostWishlisted(limit);

    res.status(200).json({
        success: true,
        count: products.length,
        products,
    });
});

export const getWishlistCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const count = await WishlistService.getWishlistCount(req.user._id.toString());

    res.status(200).json({
        success: true,
        count,
    });
});