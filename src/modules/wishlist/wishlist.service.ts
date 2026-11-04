import { Wishlist, IWishlist } from './wishlist.model';
import { Product } from '../product/product.model';
import { CartService } from '../cart/cart.service';
import { AddToWishlistDTO, MoveToCartDTO } from './wishlist.dto';
import mongoose from 'mongoose';

export class WishlistService {
    private static readonly MAX_WISHLIST_ITEMS = 100;

    static async getWishlist(userId: string): Promise<IWishlist> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        let wishlist = await Wishlist.findOne({ user: userId })
            .populate('items.product');

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: userId, items: [] });
            return await wishlist.populate('items.product');
        }

        const originalLength = wishlist.items.length;
        wishlist.items = wishlist.items.filter(item => {
            return item.product &&
                typeof item.product === 'object' &&
                !!(item.product as unknown as { _id?: unknown })._id;
        });

        if (wishlist.items.length !== originalLength) {
            await wishlist.save();
        }

        return wishlist;
    }

    static async addToWishlist(userId: string, dto: AddToWishlistDTO): Promise<IWishlist> {
        const { productId } = dto;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, items: [] });
        }

        const existingItem = wishlist.items.find(
            item => item.product.toString() === productId
        );

        if (existingItem) {
            throw new Error('Product already in wishlist');
        }

        if (wishlist.items.length >= this.MAX_WISHLIST_ITEMS) {
            throw new Error(`Maximum ${this.MAX_WISHLIST_ITEMS} items allowed in wishlist`);
        }

        wishlist.items.push({
            product: new mongoose.Types.ObjectId(productId),
            addedAt: new Date(),
        });

        await wishlist.save();

        return await Wishlist.findById(wishlist._id)
            .populate('items.product') as IWishlist;
    }

    static async removeFromWishlist(userId: string, productId: string): Promise<IWishlist> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            throw new Error('Wishlist not found');
        }

        const itemIndex = wishlist.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            throw new Error('Product not in wishlist');
        }

        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();

        return await Wishlist.findById(wishlist._id)
            .populate('items.product') as IWishlist;
    }

    static async clearWishlist(userId: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        await Wishlist.findOneAndUpdate(
            { user: userId },
            { items: [] }
        );
    }

    static async moveToCart(userId: string, dto: MoveToCartDTO): Promise<{
        wishlist: IWishlist;
        cart: unknown;
    }> {
        const { productId, quantity = 1 } = dto;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            throw new Error('Wishlist not found');
        }

        const itemIndex = wishlist.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            throw new Error('Product not in wishlist');
        }

        const cart = await CartService.addToCart(userId, {
            productId,
            quantity,
        });

        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();

        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product') as IWishlist;

        return {
            wishlist: updatedWishlist,
            cart,
        };
    }

    static async isInWishlist(userId: string, productId: string): Promise<boolean> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const wishlist = await Wishlist.findOne({
            user: userId,
            'items.product': productId,
        });

        return !!wishlist;
    }

    static async getPublicWishlist(userId: string): Promise<IWishlist | null> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const wishlist = await Wishlist.findOne({
            user: userId,
            isPublic: true,
        })
            .populate('items.product')
            .populate('user', 'name');

        return wishlist;
    }

    static async togglePublicStatus(userId: string): Promise<IWishlist> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: userId, items: [] });
        }

        wishlist.isPublic = !wishlist.isPublic;
        await wishlist.save();

        return await wishlist.populate('items.product');
    }

    static async getMostWishlisted(limit: number = 10): Promise<unknown[]> {
        const result = await Wishlist.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: 0,
                    product: {
                        _id: '$product._id',
                        name: '$product.name',
                        price: '$product.price',
                        images: '$product.images',
                    },
                    wishlistCount: '$count',
                },
            },
        ]);

        return result;
    }

    static async getWishlistCount(userId: string): Promise<number> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const wishlist = await Wishlist.findOne({ user: userId });
        return wishlist ? wishlist.items.length : 0;
    }
}