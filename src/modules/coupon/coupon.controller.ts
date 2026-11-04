import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { CouponService } from './coupon.service';
import { validateCreateCoupon, validateUpdateCoupon, CouponQueryDTO } from './coupon.dto';

export const createCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateCreateCoupon(req.body);
    const coupon = await CouponService.createCoupon(req.user._id.toString(), dto);

    res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        coupon,
    });
});

export const getAllCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: CouponQueryDTO = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        status: (req.query.status as 'active' | 'inactive' | 'expired') ?? undefined,
        discountType: (req.query.discountType as 'percentage' | 'fixed' | 'free_shipping') ?? undefined,
        isPublic: req.query.isPublic === 'true',
    };

    const result = await CouponService.getAllCoupons(query);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const getPublicCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const coupons = await CouponService.getPublicCoupons();

    res.status(200).json({
        success: true,
        count: coupons.length,
        coupons,
    });
});

export const getCouponById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid coupon ID' });
        return;
    }
    const coupon = await CouponService.getCouponById(id);

    if (!coupon) {
        res.status(404).json({ success: false, message: 'Coupon not found' });
        return;
    }

    res.status(200).json({
        success: true,
        coupon,
    });
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { code, cartTotal, cartItems } = req.body;

    if (!code || !cartTotal) {
        res.status(400).json({
            success: false,
            message: 'Coupon code and cart total are required'
        });
        return;
    }

    const result = await CouponService.validateAndApplyCoupon(req.user._id.toString(), {
        code,
        cartTotal: Number(cartTotal),
        cartItems,
    });

    res.status(200).json({
        success: result.valid,
        ...result,
    });
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid coupon ID' });
        return;
    }
    const dto = validateUpdateCoupon(req.body);

    const coupon = await CouponService.updateCoupon(id, dto);

    if (!coupon) {
        res.status(404).json({ success: false, message: 'Coupon not found' });
        return;
    }

    res.status(200).json({
        success: true,
        message: 'Coupon updated successfully',
        coupon,
    });
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid coupon ID' });
        return;
    }
    await CouponService.deleteCoupon(id);

    res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully',
    });
});

export const getCouponStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid coupon ID' });
        return;
    }
    const stats = await CouponService.getCouponStats(id);

    res.status(200).json({
        success: true,
        stats,
    });
});