import { Router } from 'express';
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    getCategories,
    getLowStockProducts,
    getProductStats
} from './product.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/stats', authMiddleware, roleMiddleware(['admin']), getProductStats);
router.get('/admin/stats', authMiddleware, roleMiddleware(['admin']), getProductStats);
router.get('/low-stock', authMiddleware, roleMiddleware(['admin']), getLowStockProducts);
router.get('/admin/low-stock', authMiddleware, roleMiddleware(['admin']), getLowStockProducts);
router.get('/:id', getProductById);


router.post('/', authMiddleware, roleMiddleware(['admin']), createProduct);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateProduct);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteProduct);


export default router;