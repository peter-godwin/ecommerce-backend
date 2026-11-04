import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../utils/AuthError';

export const roleMiddleware = (roles: readonly ('user' | 'admin')[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AuthError('You are not authorized to access this resource', 403));
    }
    next();
  };
};
