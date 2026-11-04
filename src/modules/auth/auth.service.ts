import { User } from "../user/user.model";
import { generateToken } from "../../utils/jwt";
import { CreateUserDTO, LoginDTO } from "../user/user.dto";
import { AuthError } from "../../utils/AuthError";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../utils/email";
import { assertStrongPassword } from '../../utils/password';
import { RefreshToken } from './refresh-token.model';
import { env } from '../../config/env';
import crypto from "crypto";

const hashRefreshToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

const durationToMilliseconds = (value: string): number => {
    const match = /^(\d+)\s*([mhd])$/i.exec(value);
    if (!match) {
        throw new Error('Invalid refresh-token lifetime configuration');
    }

    const amount = Number(match[1]);
    const units: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
    return amount * units[match[2].toLowerCase()];
};

const refreshLifetimeFor = (role: 'user' | 'admin'): string =>
    role === 'admin' ? env.adminRefreshTokenExpiresIn : env.refreshTokenExpiresIn;

const accessLifetimeFor = (role: 'user' | 'admin'): string =>
    role === 'admin' ? env.adminJwtExpiresIn : env.jwtExpiresIn;

const issueRefreshToken = async (userId: string, role: 'user' | 'admin'): Promise<{ token: string; expiresAt: Date }> => {
    const token = crypto.randomBytes(64).toString('base64url');
    const expiresAt = new Date(Date.now() + durationToMilliseconds(refreshLifetimeFor(role)));
    await RefreshToken.create({ user: userId, tokenHash: hashRefreshToken(token), expiresAt });
    return { token, expiresAt };
};

export const register = async (userData: CreateUserDTO) => {
    const name = typeof userData.name === 'string' ? userData.name.trim() : '';
    const email = typeof userData.email === 'string' ? userData.email.trim().toLowerCase() : '';
    const phone = typeof userData.phone === 'string' ? userData.phone.trim() : undefined;

    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) {
        throw new AuthError('Please provide a valid name and email address', 400);
    }
    assertStrongPassword(userData.password);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AuthError("Email already registered", 409);
    }

    const user = await User.create({ name, email, password: userData.password, phone, role: 'user' });

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
        await sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save({ validateBeforeSave: false });

        console.error('Failed to send verification email:', error);
    }

    const token = generateToken({
        id: user._id.toString(),
        tokenVersion: user.tokenVersion
    }, accessLifetimeFor(user.role));
    const refreshToken = await issueRefreshToken(user._id.toString(), user.role);

    const userObj = user.toObject();
    const { password, ...userWithoutPassword } = userObj;

    return {
        user: userWithoutPassword,
        token,
        refreshToken,
        message: 'Registration successful! Please check your email to verify your account.'
    };
};

export const login = async (credentials: LoginDTO) => {
    const email = typeof credentials.email === 'string' ? credentials.email.trim().toLowerCase() : '';
    if (!email || typeof credentials.password !== 'string') {
        throw new AuthError('Invalid credentials', 401);
    }

    const user = await User.findOne({ email }).select('+password +tokenVersion');

    if (!user) {
        throw new AuthError("Invalid credentials", 401);
    }

    if (!user.isActive) {
        throw new AuthError('Invalid credentials', 401);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
        throw new AuthError('Account temporarily locked. Please try again later.', 423);
    }

    const isMatch = await user.comparePassword(credentials.password);
    if (!isMatch) {
        await user.incLoginAttempts();
        throw new AuthError("Invalid credentials", 401);
    }

    if (!user.isEmailVerified) {
        throw new AuthError("Please verify your email before logging in", 403);
    }

    await user.resetLoginAttempts();

    const token = generateToken({
        id: user._id.toString(),
        tokenVersion: user.tokenVersion
    }, accessLifetimeFor(user.role));
    const refreshToken = await issueRefreshToken(user._id.toString(), user.role);

    const userObj = user.toObject();
    const { password, ...userWithoutPassword } = userObj;

    return { user: userWithoutPassword, token, refreshToken };
};

export const verifyEmail = async (verificationToken: string) => {
    const emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    const user = await User.findOne({
        emailVerificationToken,
        emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
        throw new AuthError('Invalid or expired verification token', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;

    await user.save();

    return { message: 'Email verified successfully!' };
};

export const resendVerificationEmail = async (email: string) => {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = normalizedEmail ? await User.findOne({ email: normalizedEmail }) : null;

    if (!user || user.isEmailVerified) {
        return { message: 'If an unverified account exists, a verification email has been sent.' };
    }

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
        await sendVerificationEmail(user.email, verificationToken);
        return { message: 'Verification email resent successfully' };
    } catch (error) {
        console.log(error)
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save({ validateBeforeSave: false });

        throw new AuthError('Email could not be sent', 500);
    }
};

export const forgotPassword = async (email: string) => {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = normalizedEmail ? await User.findOne({ email: normalizedEmail }) : null;

    if (!user) {
        return { message: 'If an account exists, a password reset email has been sent.' };
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    try {
        await sendPasswordResetEmail(user.email, resetToken);
        return { message: 'If an account exists, a password reset email has been sent.' };
    } catch (error) {
        console.log(error)
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });

        throw new AuthError('Email could not be sent', 500);
    }
};

export const resetPassword = async (resetToken: string, newPassword: string) => {
    assertStrongPassword(newPassword);
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        throw new AuthError('Invalid or expired reset token', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    await RefreshToken.updateMany({ user: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });

    return { message: 'Password reset successful. Please sign in again.' };
};

export const logout = async (userId: string): Promise<void> => {
    const user = await User.findById(userId).select('+tokenVersion');
    if (!user) {
        throw new AuthError('Not authorized', 401);
    }

    user.tokenVersion += 1;
    await user.save({ validateBeforeSave: false });
    await RefreshToken.updateMany({ user: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
};

export const refresh = async (rawRefreshToken: string) => {
    if (!rawRefreshToken || rawRefreshToken.length < 32) {
        throw new AuthError('Invalid refresh token', 401);
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const now = new Date();
    const consumedToken = await RefreshToken.findOneAndUpdate(
        { tokenHash, revokedAt: { $exists: false }, expiresAt: { $gt: now } },
        { $set: { revokedAt: now } },
        { new: true },
    );

    if (!consumedToken) {
        const reusedToken = await RefreshToken.findOne({ tokenHash }).select('+tokenHash');
        if (reusedToken) {
            await RefreshToken.updateMany({ user: reusedToken.user, revokedAt: { $exists: false } }, { $set: { revokedAt: now } });
        }
        throw new AuthError('Invalid refresh token', 401);
    }

    const user = await User.findById(consumedToken.user).select('+tokenVersion');
    if (!user) {
        throw new AuthError('Invalid refresh token', 401);
    }
    if (!user.isActive || !user.isEmailVerified) {
        throw new AuthError('Not authorized', 401);
    }

    const token = generateToken({ id: user._id.toString(), tokenVersion: user.tokenVersion }, accessLifetimeFor(user.role));
    const refreshToken = await issueRefreshToken(user._id.toString(), user.role);
    return { token, refreshToken };
};
