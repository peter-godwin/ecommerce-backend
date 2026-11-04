import { Request, Response } from 'express';
import { UserService } from './user.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateUpdateUser, UserQueryDTO } from './user.dto';

export const getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: UserQueryDTO = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        role: req.query.role as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        order: req.query.order as 'asc' | 'desc' | undefined,
    };

    const result = await UserService.getAllUsers(query);
    res.status(200).json({ success: true, ...result });
});

export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
    }

    const user = await UserService.getUserById(id);
    res.status(200).json({ success: true, user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
    }

    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
    }

    const updateData = validateUpdateUser(req.body);

    if (req.user.role !== 'admin') {
        delete updateData.role;
    }

    const user = await UserService.updateUser(id, updateData);
    res.status(200).json({ success: true, message: 'User updated successfully', user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
    }

    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    if (req.user._id.toString() === id) {
        res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        return;
    }

    await UserService.deleteUser(id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const user = await UserService.getUserById(req.user._id.toString());
    res.status(200).json({ success: true, user });
});

export const updateCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const updateData = validateUpdateUser(req.body);
    delete updateData.role;

    const user = await UserService.updateUser(req.user._id.toString(), updateData);
    res.status(200).json({ success: true, message: 'Profile updated successfully', user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current and new password are required' });
        return;
    }

    await UserService.changePassword(req.user._id.toString(), currentPassword, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully' });
});

export const getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await UserService.getUserStats();
    res.status(200).json({ success: true, stats });
});
