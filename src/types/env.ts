export interface Env {
    port: number;
    mongoUri: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    adminJwtExpiresIn: string;
    refreshTokenExpiresIn: string;
    adminRefreshTokenExpiresIn: string;
    nodeEnv: string;
    appEnv: string;
    devEndpointsEnabled: boolean;
    email: {
        host: string;
        port: number;
        user: string;
        password: string;
        from: string;
    };
    frontendUrl: string;
    stripe: {
        secretKey: string;
        publishableKey: string;
        webhookSecret: string;
        currency: string;
    };
    cloudinary?: {
        cloudName: string;
        apiKey: string;
        apiSecret: string;
    };
}
