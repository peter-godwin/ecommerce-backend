import { GiftCard, IGiftCard, generateGiftCardCode } from './giftcard.model';
import {
    PurchaseGiftCardDTO,
    AdjustBalanceDTO,
    IssuePromoGiftCardDTO,
} from './giftcard.dto';
import { sendEmail } from '../../utils/email';
import mongoose from 'mongoose';

export class GiftCardService {
    private static async generateUniqueCode(): Promise<string> {
        let code = generateGiftCardCode();
        let exists = await GiftCard.findOne({ code });

        while (exists) {
            code = generateGiftCardCode();
            exists = await GiftCard.findOne({ code });
        }

        return code;
    }

    static async purchaseGiftCard(
        userId: string,
        dto: PurchaseGiftCardDTO
    ): Promise<IGiftCard> {
        const code = await this.generateUniqueCode();

        const giftCard = await GiftCard.create({
            code,
            initialBalance: dto.amount,
            currentBalance: dto.amount,
            purchasedBy: userId,
            recipientEmail: dto.recipientEmail,
            recipientName: dto.recipientName,
            senderName: dto.senderName,
            message: dto.message,
            isGift: dto.isGift,
            deliveryDate: dto.deliveryDate,
            status: 'active',
            transactions: [{
                type: 'purchase',
                amount: dto.amount,
                balanceAfter: dto.amount,
                createdAt: new Date(),
            }],
        });

        const shouldSendNow = !dto.deliveryDate || dto.deliveryDate <= new Date();

        if (shouldSendNow) {
            await this.deliverGiftCard(giftCard);
        }

        return giftCard;
    }

    static async deliverGiftCard(giftCard: IGiftCard): Promise<void> {
        try {
            await sendEmail({
                to: giftCard.recipientEmail,
                subject: giftCard.isGift
                    ? `${giftCard.senderName || 'Someone'} sent you a gift card! 🎁`
                    : 'Your Gift Card is Ready! 🎁',
                html: this.generateGiftCardEmail(giftCard),
            });

            giftCard.deliveredAt = new Date();
            await giftCard.save();

            console.log(`✅ Gift card ${giftCard.code} delivered to ${giftCard.recipientEmail}`);
        } catch (error) {
            console.error('❌ Failed to deliver gift card:', error);
        }
    }

    private static generateGiftCardEmail(giftCard: IGiftCard): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .card { 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        border-radius: 16px; 
                        padding: 40px; 
                        text-align: center;
                        margin: 20px 0;
                    }
                    .amount { font-size: 48px; font-weight: bold; margin: 10px 0; }
                    .code { 
                        background: rgba(255,255,255,0.2); 
                        padding: 15px; 
                        border-radius: 8px; 
                        font-size: 24px; 
                        letter-spacing: 2px; 
                        font-family: monospace;
                        margin: 20px 0;
                    }
                    .message { 
                        font-style: italic; 
                        background: #f9fafb; 
                        padding: 20px; 
                        border-radius: 8px; 
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <p>🎁 GIFT CARD</p>
                        <div class="amount">$${giftCard.initialBalance.toFixed(2)}</div>
                        <div class="code">${giftCard.code}</div>
                    </div>
                    ${giftCard.senderName ? `<p>From: <strong>${giftCard.senderName}</strong></p>` : ''}
                    ${giftCard.message ? `<div class="message">"${giftCard.message}"</div>` : ''}
                    <p>Use this code at checkout to redeem your balance. This gift card${giftCard.expiresAt ? ` expires on ${giftCard.expiresAt.toLocaleDateString()}` : ' does not expire'}.</p>
                </div>
            </body>
            </html>
        `;
    }

    static async checkGiftCard(code: string): Promise<IGiftCard> {
        const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

        if (!giftCard) {
            throw new Error('Gift card not found');
        }

        return giftCard;
    }

    static async redeemGiftCard(
        code: string,
        amountToRedeem: number,
        orderId?: string
    ): Promise<{ giftCard: IGiftCard; amountApplied: number }> {
        const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

        if (!giftCard) {
            throw new Error('Gift card not found');
        }

        if (giftCard.status === 'void') {
            throw new Error('This gift card has been voided');
        }

        if (giftCard.status === 'expired' || (giftCard.expiresAt && new Date() > giftCard.expiresAt)) {
            throw new Error('This gift card has expired');
        }

        if (giftCard.currentBalance <= 0) {
            throw new Error('This gift card has no remaining balance');
        }

        const amountApplied = Math.min(giftCard.currentBalance, amountToRedeem);
        const newBalance = Math.round((giftCard.currentBalance - amountApplied) * 100) / 100;

        giftCard.currentBalance = newBalance;
        giftCard.transactions.push({
            type: 'redemption',
            amount: -amountApplied,
            balanceAfter: newBalance,
            order: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
            createdAt: new Date(),
        });

        if (newBalance === 0) {
            giftCard.status = 'redeemed';
        }

        await giftCard.save();

        return { giftCard, amountApplied };
    }

    static async refundToGiftCard(
        code: string,
        amount: number,
        orderId?: string
    ): Promise<IGiftCard> {
        const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

        if (!giftCard) {
            throw new Error('Gift card not found');
        }

        const newBalance = Math.round((giftCard.currentBalance + amount) * 100) / 100;
        giftCard.currentBalance = Math.min(newBalance, giftCard.initialBalance);

        giftCard.transactions.push({
            type: 'refund',
            amount,
            balanceAfter: giftCard.currentBalance,
            order: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
            createdAt: new Date(),
        });

        if (giftCard.status === 'redeemed' && giftCard.currentBalance > 0) {
            giftCard.status = 'active';
        }

        await giftCard.save();

        return giftCard;
    }

    static async getUserGiftCards(userId: string, email: string): Promise<{
        purchased: IGiftCard[];
        received: IGiftCard[];
    }> {
        const [purchased, received] = await Promise.all([
            GiftCard.find({ purchasedBy: userId }).sort({ createdAt: -1 }),
            GiftCard.find({ recipientEmail: email.toLowerCase() }).sort({ createdAt: -1 }),
        ]);

        return { purchased, received };
    }

    static async issuePromoGiftCard(
        adminId: string,
        dto: IssuePromoGiftCardDTO
    ): Promise<IGiftCard> {
        const code = await this.generateUniqueCode();

        const expiresAt = dto.expiresInDays
            ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
            : undefined;

        const giftCard = await GiftCard.create({
            code,
            initialBalance: dto.amount,
            currentBalance: dto.amount,
            recipientEmail: dto.recipientEmail,
            recipientName: dto.recipientName,
            senderName: 'Store Promotion',
            message: dto.message,
            isGift: true,
            expiresAt,
            status: 'active',
            transactions: [{
                type: 'purchase',
                amount: dto.amount,
                balanceAfter: dto.amount,
                performedBy: new mongoose.Types.ObjectId(adminId),
                note: 'Promotional gift card issued by admin',
                createdAt: new Date(),
            }],
        });

        await this.deliverGiftCard(giftCard);

        return giftCard;
    }

    static async adjustBalance(
        adminId: string,
        code: string,
        dto: AdjustBalanceDTO
    ): Promise<IGiftCard> {
        const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

        if (!giftCard) {
            throw new Error('Gift card not found');
        }

        const newBalance = Math.round((giftCard.currentBalance + dto.amount) * 100) / 100;

        if (newBalance < 0) {
            throw new Error('Adjustment would result in negative balance');
        }

        giftCard.currentBalance = newBalance;
        giftCard.transactions.push({
            type: 'adjustment',
            amount: dto.amount,
            balanceAfter: newBalance,
            performedBy: new mongoose.Types.ObjectId(adminId),
            note: dto.note,
            createdAt: new Date(),
        });

        if (newBalance > 0 && giftCard.status === 'redeemed') {
            giftCard.status = 'active';
        }

        await giftCard.save();

        return giftCard;
    }

    static async voidGiftCard(code: string, adminId: string, reason: string): Promise<IGiftCard> {
        const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

        if (!giftCard) {
            throw new Error('Gift card not found');
        }

        giftCard.status = 'void';
        giftCard.transactions.push({
            type: 'adjustment',
            amount: -giftCard.currentBalance,
            balanceAfter: 0,
            performedBy: new mongoose.Types.ObjectId(adminId),
            note: `Voided: ${reason}`,
            createdAt: new Date(),
        });
        giftCard.currentBalance = 0;

        await giftCard.save();

        return giftCard;
    }

    static async getAllGiftCards(filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        giftCards: IGiftCard[];
        pagination: { page: number; limit: number; total: number; pages: number };
    }> {
        const page = Math.max(1, filters?.page || 1);
        const limit = Math.min(100, Math.max(1, filters?.limit || 20));
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = {};
        if (filters?.status) {
            query.status = filters.status;
        }

        const [giftCards, total] = await Promise.all([
            GiftCard.find(query)
                .populate('purchasedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            GiftCard.countDocuments(query),
        ]);

        return {
            giftCards: giftCards as IGiftCard[],
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    static async getGiftCardStats(): Promise<Record<string, unknown>> {
        const [totals, byStatus] = await Promise.all([
            GiftCard.aggregate([
                {
                    $group: {
                        _id: null,
                        totalIssued: { $sum: '$initialBalance' },
                        totalOutstanding: { $sum: '$currentBalance' },
                        count: { $sum: 1 },
                    },
                },
            ]),
            GiftCard.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$currentBalance' } } },
            ]),
        ]);

        return {
            totalIssued: totals[0]?.totalIssued || 0,
            totalOutstanding: totals[0]?.totalOutstanding || 0,
            totalRedeemed: (totals[0]?.totalIssued || 0) - (totals[0]?.totalOutstanding || 0),
            count: totals[0]?.count || 0,
            byStatus,
        };
    }
}