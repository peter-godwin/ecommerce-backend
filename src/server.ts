import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { TransactionHelper } from './utils/transaction';
import { API_VERSION, getVersionInfo } from './config/version';

const PORT = env.port;

const startServer = async () => {
    try {
        await connectDB();

        const supportsTransactions = await TransactionHelper.supportsTransactions();

        if (supportsTransactions) {
            console.log('MongoDB transactions: ENABLED (Replica Set detected)');
        } else {
            console.log('MongoDB transactions: DISABLED (Standalone mode)');
            console.log('Tip: Use replica set in production for transaction support');
        }

        app.listen(PORT, () => {
            const versionInfo = getVersionInfo();
            console.log('=================================');
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${env.nodeEnv}`);
            console.log(`API Version: ${API_VERSION.CURRENT} (package ${versionInfo.packageVersion})`);
            console.log(`API URL: http://localhost:${PORT}/api/${API_VERSION.CURRENT}`);
            console.log(`Legacy API (deprecated): http://localhost:${PORT}/api`);
            console.log(`Health Check: http://localhost:${PORT}/health`);
            console.log(`Versioned Health: http://localhost:${PORT}/api/${API_VERSION.CURRENT}/health`);
            console.log('=================================');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

const gracefulShutdown = () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();