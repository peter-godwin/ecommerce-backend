import dotenv from 'dotenv';
import { Env } from '../types/env';

dotenv.config();

export const env: Env = {
    port: parseInt(process.env.PORT!, 10),
    mongoUri: process.env.MONGODB_URI!,
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '10m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    adminRefreshTokenExpiresIn: process.env.ADMIN_REFRESH_TOKEN_EXPIRES_IN || '7d',
    nodeEnv: process.env.NODE_ENV || 'development',
    appEnv: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    devEndpointsEnabled:
        process.env.NODE_ENV === 'development' ||
        process.env.ENABLE_DEV_ENDPOINTS === 'true',
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASS || '',
        from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        currency: process.env.STRIPE_CURRENCY || 'usd',
    },
};

if (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET) {
    env.cloudinary = {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    };
}

const validateEnv = () => {
    const requiredVars = [
        { key: 'MONGODB_URI', value: env.mongoUri },
        { key: 'JWT_SECRET', value: env.jwtSecret },
    ];

    const missing = requiredVars.filter(v => !v.value);

    if (missing.length > 0) {
        console.error('Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v.key}`));
        console.error('\n Please check your .env file');
        process.exit(1);
    }

    if (env.jwtSecret.length < 32) {
        const message = 'JWT_SECRET must be at least 32 characters long';
        if (env.nodeEnv === 'production') {
            console.error(`❌ ${message}`);
            process.exit(1);
        }
        console.warn(`Warning: ${message}`);
    }

    if (env.nodeEnv === 'development') {
        if (!env.email.user || !env.email.password) {
            console.warn('Warning: Email credentials not set. Password reset will not work.');
        }
        if (!env.stripe.secretKey || !env.stripe.publishableKey) {
            console.warn('Warning: Stripe credentials not set. Payment processing will not work.');
        }
    }
};

if (process.env.NODE_ENV !== 'test') {
    validateEnv();
}

console.log('Environment loaded successfully');
