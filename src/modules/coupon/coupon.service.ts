import { Coupon, ICoupon } from './coupon.model';
import { CreateCouponDTO, UpdateCouponDTO, ApplyCouponDTO, CouponQueryDTO } from './coupon.dto';
import mongoose from 'mongoose';

export class CouponService {
    static async createCoupon(adminId: string, dto: CreateCouponDTO): Promise<ICoupon> {
        const existing = await Coupon.findOne({ code: dto.code });
        if (existing) {
            throw new Error(`Coupon code "${dto.code}" already exists`);
        }

        const coupon = await Coupon.create({
            ...dto,
            createdBy: adminId,
        });

        return coupon;
    }

    static async getAllCoupons(query: CouponQueryDTO = {}): Promise<{
        coupons: ICoupon[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};

        if (query.status) {
            filter.status = query.status;
        }

        if (query.discountType) {
            filter.discountType = query.discountType;
        }

        if (query.isPublic !== undefined) {
            filter.isPublic = query.isPublic;
        }

        const [coupons, total] = await Promise.all([
            Coupon.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Coupon.countDocuments(filter),
        ]);

        return {
            coupons: coupons as ICoupon[],
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    static async getPublicCoupons(): Promise<ICoupon[]> {
        const now = new Date();

        return await Coupon.find({
            isPublic: true,
            status: 'active',
            validFrom: { $lte: now },
            validUntil: { $gte: now },
        }).select('-usedBy');
    }

    static async getCouponById(couponId: string): Promise<ICoupon | null> {
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            throw new Error('Invalid coupon ID');
        }

        return await Coupon.findById(couponId);
    }

    static async getCouponByCode(code: string): Promise<ICoupon | null> {
        return await Coupon.findOne({ code: code.toUpperCase() });
    }

    static async updateCoupon(couponId: string, dto: UpdateCouponDTO): Promise<ICoupon | null> {
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            throw new Error('Invalid coupon ID');
        }

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { $set: dto },
            { new: true, runValidators: true }
        );

        return coupon;
    }

    static async deleteCoupon(couponId: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            throw new Error('Invalid coupon ID');
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            throw new Error('Coupon not found');
        }

        if (coupon.usedCount > 0) {
            throw new Error('Cannot delete a coupon that has been used. Set it to inactive instead.');
        }

        await coupon.deleteOne();
    }

    static async validateAndApplyCoupon(
        userId: string,
        dto: ApplyCouponDTO
    ): Promise<{
        valid: boolean;
        coupon?: ICoupon;
        discount: number;
        finalTotal: number;
        message: string;
    }> {
        const coupon = await Coupon.findOne({ code: dto.code.toUpperCase() });

        if (!coupon) {
            return {
                valid: false,
                discount: 0,
                finalTotal: dto.cartTotal,
                message: 'Invalid coupon code',
            };
        }

        if (coupon.status !== 'active') {
            return {
                valid: false,
                discount: 0,
                finalTotal: dto.cartTotal,
                message: 'Coupon is not active',
            };
        }

        const now = new Date();
        if (now < coupon.validFrom) {
            return {
                valid: false,
                discount: 0,
                finalTotal: dto.cartTotal,
                message: `Coupon is valid from ${coupon.validFrom.toLocaleDateString()}`,
            };
        }

        if (now > coupon.validUntil) {
            return {
                valid: false,
                discount: 0,
                finalTotal: dto.cartTotal,
                message: 'Coupon has expired',
            };
        }

        if (coupon.minOrderValue && dto.cartTotal < coupon.minOrderValue) {
            return {
                valid: false,
                discount: 0,
                finalTotal: dto.cartTotal,
                message: `Minimum order value of $${coupon.minOrderValue} required`,
            };
        }

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return {
                valid: false,
                discount: 0,
                finalTotal: dto.cartTotal,
                message: 'Coupon usage limit reached',
            };
        }

        const userUsageCount = coupon.usedBy.filter(
            usage => usage.user.toString() === userId
        ).length;

        if (userUsageCount >= (coupon.maxUsesPerUser || 1)) {
            return {
                valid: false,
                discount: 0,
                finalTotal: dto.cartTotal,
                message: `You have already used this coupon ${coupon.maxUsesPerUser || 1} time(s)`,
            };
        }

        if (dto.cartItems && coupon.applicableProducts && coupon.applicableProducts.length > 0) {
            const hasApplicableProduct = dto.cartItems.some(item =>
                coupon.applicableProducts!.some(
                    prodId => prodId.toString() === item.productId
                )
            );

            if (!hasApplicableProduct) {
                return {
                    valid: false,
                    discount: 0,
                    finalTotal: dto.cartTotal,
                    message: 'Coupon not applicable to items in cart',
                };
            }
        }

        let discount = 0;

        if (coupon.discountType === 'percentage') {
            discount = (dto.cartTotal * coupon.discountValue) / 100;

            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else if (coupon.discountType === 'fixed') {
            discount = Math.min(coupon.discountValue, dto.cartTotal);
        } else if (coupon.discountType === 'free_shipping') {
            discount = 0;
        }

        const finalTotal = Math.max(0, dto.cartTotal - discount);

        return {
            valid: true,
            coupon,
            discount: Math.round(discount * 100) / 100,
            finalTotal: Math.round(finalTotal * 100) / 100,
            message: 'Coupon applied successfully',
        };
    }

    static async recordCouponUsage(
        couponCode: string,
        userId: string,
        orderValue: number,
        discountAmount: number
    ): Promise<void> {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

        if (!coupon) {
            throw new Error('Coupon not found');
        }

        coupon.usedCount += 1;
        coupon.usedBy.push({
            user: new mongoose.Types.ObjectId(userId),
            usedAt: new Date(),
            orderValue,
            discountAmount,
        });

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            coupon.status = 'expired';
        }

        await coupon.save();
    }

    static async getCouponStats(couponId: string): Promise<Record<string, unknown>> {
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            throw new Error('Invalid coupon ID');
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            throw new Error('Coupon not found');
        }

        const totalDiscount = coupon.usedBy.reduce(
            (sum, usage) => sum + usage.discountAmount,
            0
        );

        const totalOrderValue = coupon.usedBy.reduce(
            (sum, usage) => sum + usage.orderValue,
            0
        );

        return {
            code: coupon.code,
            totalUses: coupon.usedCount,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalOrderValue: Math.round(totalOrderValue * 100) / 100,
            averageDiscount: coupon.usedCount > 0
                ? Math.round((totalDiscount / coupon.usedCount) * 100) / 100
                : 0,
            remainingUses: coupon.maxUses
                ? coupon.maxUses - coupon.usedCount
                : 'Unlimited',
        };
    }
}