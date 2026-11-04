export interface CreateUserDTO {
    name: string;
    email: string;
    password: string;
    phone?: string;
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface UpdateUserDTO {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
    };
    avatar?: string;
    role?: 'user' | 'admin';
}

export interface UserResponseDTO {
    id: string;
    name: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    isActive: boolean;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
    };
    avatar?: string;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt?: Date;
}

export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}

export interface UserQueryDTO {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
}

export const validateUpdateUser = (dto: UpdateUserDTO): UpdateUserDTO => {
    const validated: UpdateUserDTO = {};

    if (dto.name !== undefined) {
        if (typeof dto.name !== 'string' || dto.name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters');
        }
        validated.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(dto.email)) {
            throw new Error('Please enter a valid email');
        }
        validated.email = dto.email.toLowerCase().trim();
    }

    if (dto.phone !== undefined) {
        const phoneRegex = /^\+?[\d\s-()]+$/;
        if (!phoneRegex.test(dto.phone)) {
            throw new Error('Please enter a valid phone number');
        }
        validated.phone = dto.phone.trim();
    }

    if (dto.address !== undefined) {
        validated.address = dto.address;
    }

    if (dto.avatar !== undefined) {
        validated.avatar = dto.avatar;
    }

    if (dto.role !== undefined) {
        validated.role = dto.role;
    }

    return validated;
};
