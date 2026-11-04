import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../utils/AuthError';
import { env } from '../config/env';
import {MongoError} from "../types/middleware";



export const errorMiddleware = (
    err: Error | AuthError | MongoError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error('Error:', err);

    if (err.message.includes('Invalid file type')) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
        return;
    }

    if (err.message.includes('File too large')) {
        res.status(400).json({
            success: false,
            message: 'File size exceeds 5MB limit',
        });
        return;
    }

    if ('statusCode' in err && err.statusCode) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }

    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            message: err.message,
        });
        return;
    }

    if ('code' in err && err.code === 11000) {
        const mongoError = err as MongoError;
        const field = Object.keys(mongoError.keyValue || {})[0];
        res.status(409).json({
            success: false,
            message: `${field} already exists`,
        });
        return;
    }

    if (err.name === 'CastError') {
        res.status(400).json({
            success: false,
            message: 'Invalid ID format',
        });
        return;
    }

    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
        });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            message: 'Token expired',
        });
        return;
    }

    res.status(500).json({
        success: false,
        message: env.nodeEnv === 'development' ? err.message : 'Internal server error',
        ...(env.nodeEnv === 'development' && { stack: err.stack }),
    });

    return;
};