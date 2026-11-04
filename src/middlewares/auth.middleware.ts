import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/user/user.model';
import { AuthError } from '../utils/AuthError';
import { verifyToken } from '../utils/jwt';

export const authMiddleware = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    let token: string | undefined;

    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
        token = authorization.slice('Bearer '.length).trim();
    }

    if (!token) {
        return next(new AuthError('Not authorized, no token', 401));
    }

    try {
        const decoded = verifyToken(token);

        if (!decoded.id || !Number.isInteger(decoded.tokenVersion)) {
            return next(new AuthError('Invalid token', 401));
        }

        const user = await User.findById(decoded.id).select('-password +tokenVersion');

        if (!user) {
            return next(new AuthError('Not authorized', 401));
        }

        if (!user.isActive || !user.isEmailVerified) {
            return next(new AuthError('Not authorized', 401));
        }

        if (user.tokenVersion !== decoded.tokenVersion) {
            return next(new AuthError('Session has expired. Please sign in again.', 401));
        }

        req.user = user;
        next();
    } catch (_error) {
        return next(new AuthError('Not authorized, token failed', 401));
    }
};
