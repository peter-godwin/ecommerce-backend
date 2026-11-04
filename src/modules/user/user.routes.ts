import { Router } from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getCurrentUser,
    updateCurrentUser,
    changePassword,
    getUserStats,
} from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.get('/me', authMiddleware, getCurrentUser);
router.put('/me', authMiddleware, updateCurrentUser);
router.put('/me/password', authMiddleware, changePassword);

router.get('/', authMiddleware, roleMiddleware(['admin']), getAllUsers);
router.get('/stats', authMiddleware, roleMiddleware(['admin']), getUserStats);

router
    .route('/:id')
    .get(authMiddleware, roleMiddleware(['admin']), getUserById)
    .put(authMiddleware, roleMiddleware(['admin']), updateUser)
    .delete(authMiddleware, roleMiddleware(['admin']), deleteUser);

export default router;
