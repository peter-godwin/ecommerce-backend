import { Router } from 'express';
import {
    uploadProductImages,
    deleteProductImage,
    uploadUserAvatar,
} from './upload.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { uploadProductImages as uploadProductImagesMiddleware, uploadAvatar } from '../../utils/upload';

const router = Router();

router.post(
    '/avatar',
    authMiddleware,
    uploadAvatar,
    uploadUserAvatar
);

router.post(
    '/products/:productId',
    authMiddleware,
    roleMiddleware(['admin']),
    uploadProductImagesMiddleware,
    uploadProductImages
);

router.delete(
    '/products/:productId',
    authMiddleware,
    roleMiddleware(['admin']),
    deleteProductImage
);

export default router;