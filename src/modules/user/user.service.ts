import { User, IUser } from './user.model';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO, UserQueryDTO } from './user.dto';
import { AuthError } from '../../utils/AuthError';
import mongoose from 'mongoose';
import { assertStrongPassword } from '../../utils/password';
import { RefreshToken } from '../auth/refresh-token.model';

export class UserService {
    static async createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
        const existingUser = await User.findOne({ email: dto.email });
        if (existingUser) {
            throw new AuthError('Email already registered', 409);
        }

        assertStrongPassword(dto.password);
        const user = new User({ ...dto, role: 'user' });
        await user.save();
        return UserService.toUserResponse(user);
    }

    static async findByEmail(email: string): Promise<IUser | null> {
        return User.findOne({ email }).select('+password');
    }

    static async getAllUsers(query: UserQueryDTO = {}): Promise<{
        users: UserResponseDTO[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};

        if (query.role) {
            filter.role = query.role;
        }

        if (query.isActive !== undefined) {
            filter.isActive = query.isActive;
        }

        if (query.search) {
            filter.$or = [
                { name: { $regex: query.search, $options: 'i' } },
                { email: { $regex: query.search, $options: 'i' } }
            ];
        }

        const sortField = query.sortBy || 'createdAt';
        const sortOrder = query.order === 'asc' ? 1 : -1;
        const sort: { [key: string]: 1 | -1 } = { [sortField]: sortOrder };

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter),
        ]);

        return {
            users: users.map(user => UserService.toUserResponse(user as IUser)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    static async getUserById(id: string): Promise<UserResponseDTO> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AuthError('Invalid user ID', 400);
        }

        const user = await User.findById(id).select('-password');
        if (!user) {
            throw new AuthError('User not found', 404);
        }
        return UserService.toUserResponse(user);
    }

    static async updateUser(id: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AuthError('Invalid user ID', 400);
        }

        if (dto.email) {
            const existingUser = await User.findOne({ email: dto.email });
            if (existingUser && existingUser._id.toString() !== id) {
                throw new AuthError('Email already in use', 409);
            }
        }

        const currentUser = await User.findById(id).select('+tokenVersion');
        if (!currentUser) {
            throw new AuthError('User not found', 404);
        }

        if (currentUser.role === 'admin' && dto.role === 'user') {
            const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
            if (currentUser.isActive && activeAdminCount <= 1) {
                throw new AuthError('Cannot demote the last active administrator', 400);
            }
        }

        const sensitiveChange = dto.role !== undefined;
        const update: Record<string, unknown> = { $set: dto };
        if (sensitiveChange) {
            update.$inc = { tokenVersion: 1 };
        }

        const user = await User.findByIdAndUpdate(
            id,
            update,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AuthError('User not found', 404);
        }
        if (sensitiveChange) {
            await RefreshToken.updateMany({ user: id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
        }
        return UserService.toUserResponse(user);
    }

    static async deleteUser(id: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AuthError('Invalid user ID', 400);
        }

        const currentUser = await User.findById(id);
        if (!currentUser) {
            throw new AuthError('User not found', 404);
        }

        if (currentUser.role === 'admin' && currentUser.isActive) {
            const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
            if (activeAdminCount <= 1) {
                throw new AuthError('Cannot deactivate the last active administrator', 400);
            }
        }

        const user = await User.findByIdAndUpdate(id, {
            $set: { isActive: false },
            $inc: { tokenVersion: 1 },
        });
        if (!user) {
            throw new AuthError('User not found', 404);
        }
    }

    static async hardDeleteUser(id: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AuthError('Invalid user ID', 400);
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            throw new AuthError('User not found', 404);
        }
    }

    static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new AuthError('Invalid user ID', 400);
        }

        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new AuthError('User not found', 404);
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new AuthError('Current password is incorrect', 401);
        }

        assertStrongPassword(newPassword);

        user.password = newPassword;
        await user.save();
        await RefreshToken.updateMany({ user: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    }

    static async getUserStats(): Promise<Record<string, unknown>> {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalUsers = await User.countDocuments({ isActive: true });
        const verifiedUsers = await User.countDocuments({ isEmailVerified: true, isActive: true });
        const activeToday = await User.countDocuments({
            lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        return {
            totalUsers,
            verifiedUsers,
            activeToday,
            byRole: stats
        };
    }

    static toUserResponse(user: IUser): UserResponseDTO {
        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
            phone: user.phone,
            address: user.address,
            avatar: user.avatar,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
