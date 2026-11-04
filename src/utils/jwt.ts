import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import {TokenPayload} from "../types/jwt";


const JWT_ISSUER = 'ecommerce-backend';
const JWT_AUDIENCE = 'ecommerce-api';

export const generateToken = (payload: TokenPayload, expiresIn = env.jwtExpiresIn): string => {
    if (!env.jwtSecret) {
        throw new Error('JWT secret is not configured');
    }

    const options: SignOptions = {
        expiresIn: expiresIn as SignOptions['expiresIn'],
        algorithm: 'HS256',
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
    };

    return jwt.sign(payload, env.jwtSecret, options);
};

export const verifyToken = (token: string): TokenPayload => {
    if (!env.jwtSecret) {
        throw new Error('JWT secret is not configured');
    }

    return jwt.verify(token, env.jwtSecret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
    }) as TokenPayload;
};
