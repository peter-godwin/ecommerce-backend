import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { CartService } from './cart.service';
import { validateAddToCart, validateUpdateCartItem } from './cart.dto';

export const getCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const cart = await CartService.getCart(req.user._id.toString());
    const totals = await CartService.getCartTotal(req.user._id.toString());

    res.status(200).json({
        success: true,
        cart,
        ...totals
    });
});

export const addToCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateAddToCart(req.body);

    const cart = await CartService.addToCart(req.user._id.toString(), dto);
    const totals = await CartService.getCartTotal(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: 'Item added to cart',
        cart,
        ...totals
    });
});

export const updateCartItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { itemId } = req.params;

    if (typeof itemId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid item ID' });
        return;
    }

    const dto = validateUpdateCartItem(req.body);

    const cart = await CartService.updateCartItem(req.user._id.toString(), itemId, dto);
    const totals = await CartService.getCartTotal(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: dto.quantity === 0 ? 'Item removed from cart' : 'Cart updated',
        cart,
        ...totals
    });
});

export const removeFromCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { itemId } = req.params;

    if (typeof itemId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid item ID' });
        return;
    }

    const cart = await CartService.removeFromCart(req.user._id.toString(), itemId);
    const totals = await CartService.getCartTotal(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: 'Item removed from cart',
        cart,
        ...totals
    });
});

export const clearCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    await CartService.clearCart(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: 'Cart cleared'
    });
});

export const validateCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const validation = await CartService.validateCartForCheckout(req.user._id.toString());

    res.status(200).json({
        success: true,
        ...validation
    });
});

export const applyCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { code } = req.body;

    if (!code) {
        res.status(400).json({ success: false, message: 'Coupon code is required' });
        return;
    }

    const result = await CartService.applyCoupon(req.user._id.toString(), code);

    res.status(200).json({
        success: true,
        message: 'Coupon applied successfully',
        ...result,
    });
});

export const removeCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const cart = await CartService.removeCoupon(req.user._id.toString());

    res.status(200).json({
        success: true,
        message: 'Coupon removed',
        cart,
    });
});