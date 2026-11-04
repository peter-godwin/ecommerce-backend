import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { UploadService } from './upload.service';

export const uploadProductImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: 'No images provided' });
        return;
    }

    const imageUrls = await UploadService.uploadProductImages(productId, files);

    res.status(200).json({
        success: true,
        message: `${imageUrls.length} image(s) uploaded successfully`,
        images: imageUrls,
    });
});

export const deleteProductImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
    }
    const { imageUrl } = req.body;

    if (!imageUrl) {
        res.status(400).json({ success: false, message: 'Image URL is required' });
        return;
    }

    await UploadService.deleteProductImage(productId, imageUrl);

    res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
    });
});

export const uploadUserAvatar = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const file = req.file;
    if (!file) {
        res.status(400).json({ success: false, message: 'No image provided' });
        return;
    }

    const avatarUrl = await UploadService.uploadUserAvatar(req.user._id.toString(), file);

    res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatar: avatarUrl,
    });
});