import { Cart, ICart } from './cart.model';
import { Product, IProduct } from '../product/product.model';
import { AddToCartDTO, UpdateCartItemDTO } from './cart.dto';
import mongoose from 'mongoose';
import {CouponService} from "../coupon/coupon.service";

export class CartService {
    private static readonly MAX_CART_ITEMS = 50;

    private static readonly MAX_ITEM_QUANTITY = 100;

    static async getCart(userId: string): Promise<ICart> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const cart = await Cart.findOne({ user: userId })
            .populate('items.product')
            .lean();

        if (!cart) {
            const newCart = await Cart.create({ user: userId, items: [] });
            return newCart;
        }

        const validItems = cart.items.filter(item => item.product);

        if (validItems.length !== cart.items.length) {
            await Cart.findOneAndUpdate(
                { user: userId },
                { items: validItems }
            );
        }

        return cart as ICart;
    }

    static async addToCart(userId: string, dto: AddToCartDTO): Promise<ICart> {
        const { productId, quantity } = dto;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        if (quantity > this.MAX_ITEM_QUANTITY) {
            throw new Error(`Maximum ${this.MAX_ITEM_QUANTITY} items per product`);
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        if (!product.isActive) {
            throw new Error('Product is not available');
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (existingItemIndex === -1 && cart.items.length >= this.MAX_CART_ITEMS) {
            throw new Error(`Maximum ${this.MAX_CART_ITEMS} different items allowed in cart`);
        }

        let newQuantity = quantity;
        if (existingItemIndex > -1) {
            newQuantity = cart.items[existingItemIndex].quantity + quantity;

            if (newQuantity > this.MAX_ITEM_QUANTITY) {
                throw new Error(`Maximum ${this.MAX_ITEM_QUANTITY} items per product`);
            }
        }

        if (product.stock < newQuantity) {
            throw new Error(`Only ${product.stock} items available in stock`);
        }

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            cart.items.push({ _id: product._id, product: product._id, quantity: newQuantity });
        }

        await cart.save();

        const updatedCart = await Cart.findById(cart._id).populate('items.product');
        return updatedCart as ICart;
    }

    static async updateCartItem(userId: string, itemId: string, dto: UpdateCartItemDTO): Promise<ICart> {
        const { quantity } = dto;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw new Error('Invalid item ID');
        }

        if (quantity > this.MAX_ITEM_QUANTITY) {
            throw new Error(`Maximum ${this.MAX_ITEM_QUANTITY} items per product`);
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw new Error('Cart not found');
        }

        const itemIndex = cart.items.findIndex(
            item => item._id?.toString() === itemId
        );

        if (itemIndex === -1) {
            throw new Error('Item not found in cart');
        }

        if (quantity === 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            const product = await Product.findById(cart.items[itemIndex].product);
            if (!product) {
                cart.items.splice(itemIndex, 1);
            } else if (product.stock < quantity) {
                throw new Error(`Only ${product.stock} items available in stock`);
            } else {
                cart.items[itemIndex].quantity = quantity;
            }
        }

        await cart.save();

        const updatedCart = await Cart.findById(cart._id).populate('items.product');
        return updatedCart as ICart;
    }

    static async removeFromCart(userId: string, itemId: string): Promise<ICart> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw new Error('Invalid item ID');
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw new Error('Cart not found');
        }

        const itemIndex = cart.items.findIndex(
            item => item._id?.toString() === itemId
        );

        if (itemIndex === -1) {
            throw new Error('Item not found in cart');
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        const updatedCart = await Cart.findById(cart._id).populate('items.product');
        return updatedCart as ICart;
    }

    static async clearCart(userId: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        await Cart.findOneAndUpdate(
            { user: userId },
            { items: [] }
        );
    }

    static async getCartTotal(userId: string): Promise<{
        subtotal: number;
        discount: number;
        total: number;
        itemCount: number;
        appliedCoupon?: { code: string; discount: number };
    }> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
            return { subtotal: 0, discount: 0, total: 0, itemCount: 0 };
        }

        let subtotal = 0;
        let itemCount = 0;

        for (const item of cart.items) {
            const product = item.product as unknown as IProduct;
            if (product) {
                subtotal += product.price * item.quantity;
                itemCount += item.quantity;
            }
        }

        const discount = cart.appliedCoupon?.discount || 0;
        const total = Math.max(0, subtotal - discount);

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            discount: Math.round(discount * 100) / 100,
            total: Math.round(total * 100) / 100,
            itemCount,
            appliedCoupon: cart.appliedCoupon,
        };
    }

    static async validateCartForCheckout(userId: string): Promise<{ valid: boolean; errors: string[] }> {
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return { valid: false, errors: ['Cart is empty'] };
        }

        const errors: string[] = [];

        for (const item of cart.items) {
            const product = item.product as unknown as IProduct;

            if (!product) {
                errors.push('Some products in your cart are no longer available');
                continue;
            }

            if (product.stock < item.quantity) {
                errors.push(`${product.name}: Only ${product.stock} items available (you have ${item.quantity} in cart)`);
            }

            // Check if product is active/available
            if (!product.isActive) {
                errors.push(`${product.name} is no longer available`);
            }
        }

        return { valid: errors.length === 0, errors };
    }
    static async applyCoupon(userId: string, couponCode: string): Promise<{
        cart: ICart;
        subtotal: number;
        discount: number;
        total: number;
    }> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
            throw new Error('Cart not found');
        }

        if (cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        let subtotal = 0;
        const cartItems = [];

        for (const item of cart.items) {
            const product = item.product as unknown as IProduct;
            if (product) {
                const itemTotal = product.price * item.quantity;
                subtotal += itemTotal;
                cartItems.push({
                    productId: product._id.toString(),
                    quantity: item.quantity,
                    price: product.price,
                });
            }
        }

        const couponResult = await CouponService.validateAndApplyCoupon(userId, {
            code: couponCode,
            cartTotal: subtotal,
            cartItems,
        });

        if (!couponResult.valid) {
            throw new Error(couponResult.message);
        }

        cart.appliedCoupon = {
            code: couponCode.toUpperCase(),
            discount: couponResult.discount,
        };

        await cart.save();

        return {
            cart,
            subtotal: Math.round(subtotal * 100) / 100,
            discount: couponResult.discount,
            total: couponResult.finalTotal,
        };
    }

    static async removeCoupon(userId: string): Promise<ICart> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw new Error('Cart not found');
        }

        cart.appliedCoupon = undefined;
        await cart.save();

        return await cart.populate('items.product');
    }

}