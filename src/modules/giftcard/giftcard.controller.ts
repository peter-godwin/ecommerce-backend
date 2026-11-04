import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { GiftCardService } from './giftcard.service';
import {
    validatePurchaseGiftCard,
    validateRedeemGiftCard,
    validateAdjustBalance,
    validateIssuePromoGiftCard,
} from './giftcard.dto';

export const purchaseGiftCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validatePurchaseGiftCard(req.body);
    const giftCard = await GiftCardService.purchaseGiftCard(req.user._id.toString(), dto);

    res.status(201).json({
        success: true,
        message: 'Gift card purchased successfully',
        giftCard,
    });
});

export const checkGiftCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code } = req.params;
    if (typeof code !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid gift card code' });
        return;
    }
    const giftCard = await GiftCardService.checkGiftCard(code);

    res.status(200).json({
        success: true,
        giftCard: {
            code: giftCard.code,
            currentBalance: giftCard.currentBalance,
            initialBalance: giftCard.initialBalance,
            currency: giftCard.currency,
            status: giftCard.status,
            expiresAt: giftCard.expiresAt,
        },
    });
});

export const redeemGiftCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateRedeemGiftCard(req.body);
    const { orderTotal } = req.body;

    if (!orderTotal || Number(orderTotal) <= 0) {
        res.status(400).json({ success: false, message: 'Valid order total is required' });
        return;
    }

    const giftCard = await GiftCardService.checkGiftCard(dto.code);

    if (giftCard.status !== 'active') {
        res.status(400).json({ success: false, message: `Gift card is ${giftCard.status}` });
        return;
    }

    const amountApplied = Math.min(giftCard.currentBalance, Number(orderTotal));

    res.status(200).json({
        success: true,
        message: 'Gift card is valid',
        code: giftCard.code,
        availableBalance: giftCard.currentBalance,
        amountApplied,
        remainingOrderTotal: Math.round((Number(orderTotal) - amountApplied) * 100) / 100,
    });
});

export const getUserGiftCards = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const result = await GiftCardService.getUserGiftCards(
        req.user._id.toString(),
        req.user.email
    );

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const issuePromoGiftCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const dto = validateIssuePromoGiftCard(req.body);
    const giftCard = await GiftCardService.issuePromoGiftCard(req.user._id.toString(), dto);

    res.status(201).json({
        success: true,
        message: 'Promotional gift card issued successfully',
        giftCard,
    });
});

export const adjustBalance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { code } = req.params;
    if (typeof code !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid gift card code' });
        return;
    }
    const dto = validateAdjustBalance(req.body);

    const giftCard = await GiftCardService.adjustBalance(req.user._id.toString(), code, dto);

    res.status(200).json({
        success: true,
        message: 'Balance adjusted successfully',
        giftCard,
    });
});

export const voidGiftCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { code } = req.params;
    if (typeof code !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid gift card code' });
        return;
    }
    const { reason } = req.body;

    if (!reason) {
        res.status(400).json({ success: false, message: 'Reason is required to void a gift card' });
        return;
    }

    const giftCard = await GiftCardService.voidGiftCard(code, req.user._id.toString(), reason);

    res.status(200).json({
        success: true,
        message: 'Gift card voided',
        giftCard,
    });
});

export const getAllGiftCards = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = {
        status: req.query.status as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await GiftCardService.getAllGiftCards(filters);

    res.status(200).json({
        success: true,
        ...result,
    });
});

export const getGiftCardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await GiftCardService.getGiftCardStats();

    res.status(200).json({
        success: true,
        stats,
    });
});