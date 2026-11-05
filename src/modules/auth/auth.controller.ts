import { Request, Response } from "express";
import * as authService from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandler";

const REFRESH_COOKIE = 'refresh_token';

const refreshCookieOptions = (expiresAt?: Date) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api',
    ...(expiresAt ? { expires: expiresAt } : {}),
});

const readCookie = (cookieHeader: string | undefined, name: string): string | undefined => {
    if (!cookieHeader) return undefined;
    return cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
};

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body || {});
    res.cookie(REFRESH_COOKIE, result.refreshToken.token, refreshCookieOptions(result.refreshToken.expiresAt));
    res.status(201).json({ ...result, refreshToken: result.refreshToken.token });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { user, token, refreshToken } = await authService.login(req.body || {});
    res.cookie(REFRESH_COOKIE, refreshToken.token, refreshCookieOptions(refreshToken.expiresAt));
    res.status(200).json({ user, token, refreshToken: refreshToken.token });
});

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = readCookie(req.headers.cookie, REFRESH_COOKIE) || (req.body && typeof req.body.refreshToken === 'string' ? req.body.refreshToken : '');
    const result = await authService.refresh(refreshToken);
    res.cookie(REFRESH_COOKIE, result.refreshToken.token, refreshCookieOptions(result.refreshToken.expiresAt));
    res.status(200).json({ token: result.token, refreshToken: result.refreshToken.token });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authorized' });
        return;
    }

    await authService.logout(req.user._id.toString());
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(204).send();
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { verificationToken } = req.params;

    if (typeof verificationToken !== 'string') {
        res.status(400).json({ message: 'Invalid verification token' });
        return;
    }

    const result = await authService.verifyEmail(verificationToken);
    res.status(200).json(result);
});

export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body || {};

    if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }

    const result = await authService.resendVerificationEmail(email, req.ip);
    res.status(200).json(result);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body || {};

    if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }

    const result = await authService.forgotPassword(email);
    res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { resetToken } = req.params;
    const { password } = (req.body || {}) as { password?: string };

    if (!password) {
        res.status(400).json({ message: 'Password is required' });
        return;
    }

    if (typeof resetToken !== 'string') {
        res.status(400).json({ message: 'Invalid reset token' });
        return;
    }

    const result = await authService.resetPassword(resetToken, password);
    res.status(200).json(result);
});
