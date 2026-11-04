import { Cart } from '../modules/cart/cart.model';

export const cleanupAbandonedCarts = async () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 30);

    const result = await Cart.deleteMany({
        updatedAt: { $lt: expiryDate },
        items: { $size: 0 }
    });

    console.log(`Cleaned up ${result.deletedCount} abandoned carts`);
};


