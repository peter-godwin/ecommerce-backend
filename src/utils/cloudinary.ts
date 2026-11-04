import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';
import {UploadOptions, UploadResult} from "../types/cloudinary";


export const uploadImage = async (
    buffer: Buffer,
    options: UploadOptions = {}
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || 'ecommerce',
                transformation: options.transformation,
                public_id: options.publicId,
                resource_type: 'image',
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        bytes: result.bytes,
                    });
                } else {
                    reject(new Error('Upload failed'));
                }
            }
        );

        const stream = Readable.from(buffer);
        stream.pipe(uploadStream);
    });
};


export const deleteImage = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
        console.error('❌ Failed to delete image from Cloudinary:', error);
        throw new Error('Failed to delete image');
    }
};


export const deleteMultipleImages = async (publicIds: string[]): Promise<void> => {
    try {
        await cloudinary.api.delete_resources(publicIds);
        console.log(`✅ ${publicIds.length} images deleted from Cloudinary`);
    } catch (error) {
        console.error('❌ Failed to delete images from Cloudinary:', error);
        throw new Error('Failed to delete images');
    }
};


export const uploadProductImage = async (buffer: Buffer, productId: string): Promise<UploadResult> => {
    return uploadImage(buffer, {
        folder: 'ecommerce/products',
        publicId: `product_${productId}_${Date.now()}`,
        transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
        ]
    });
};


export const uploadUserAvatar = async (buffer: Buffer, userId: string): Promise<UploadResult> => {
    return uploadImage(buffer, {
        folder: 'ecommerce/avatars',
        publicId: `avatar_${userId}`,
        transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
        ]
    });
};