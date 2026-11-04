import { uploadProductImage, uploadUserAvatar, deleteImage, deleteMultipleImages } from '../../utils/cloudinary';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import mongoose from 'mongoose';

export class UploadService {

    static async uploadProductImages(
        productId: string,
        files: Express.Multer.File[]
    ): Promise<string[]> {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        const uploadedUrls: string[] = [];

        for (const file of files) {
            const result = await uploadProductImage(file.buffer, productId);
            uploadedUrls.push(result.url);
        }

        product.images = [...(product.images || []), ...uploadedUrls];
        await product.save();

        return uploadedUrls;
    }


    static async deleteProductImage(productId: string, imageUrl: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        const publicId = this.extractPublicId(imageUrl);
        if (publicId) {
            await deleteImage(publicId);
        }

        product.images = product.images?.filter(img => img !== imageUrl) || [];
        await product.save();
    }


    static async uploadUserAvatar(userId: string, file: Express.Multer.File): Promise<string> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.avatar) {
            const oldPublicId = this.extractPublicId(user.avatar);
            if (oldPublicId) {
                try {
                    await deleteImage(oldPublicId);
                } catch (error) {
                    console.error('Failed to delete old avatar:', error);
                }
            }
        }

        const result = await uploadUserAvatar(file.buffer, userId);

        user.avatar = result.url;
        await user.save();

        return result.url;
    }


    private static extractPublicId(url: string): string | null {
        try {
            const matches = url.match(/\/v\d+\/(.+)\.[a-z]+$/);
            return matches ? matches[1] : null;
        } catch (error) {
            return null;
        }
    }
}