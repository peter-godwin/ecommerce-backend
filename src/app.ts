import './utils/globalCrypto';
import express from "express";
import cors from "cors";
import v1Router from "./routes/v1";
import { errorMiddleware } from "./middlewares/error.middleware";
import { env } from "./config/env";
import { API_VERSION, getVersionInfo } from "./config/version";
import {
    setApiVersionHeader,
    deprecatedApiWarning,
    apiVersionNegotiator,
} from "./middlewares/apiVersion.middleware";

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(apiVersionNegotiator);


app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
    if (req.body === undefined) {
        req.body = {};
    }
    next();
});

app.get("/health", (_, res) => {
    res.setHeader('X-API-Version', API_VERSION.CURRENT);
    res.json({
        status: "OK",
        version: API_VERSION.CURRENT,
        packageVersion: getVersionInfo().packageVersion,
        environment: env.nodeEnv,
        timestamp: new Date().toISOString()
    });
});

app.get("/api", (_req, res) => {
    res.setHeader('X-API-Version', API_VERSION.CURRENT);
    res.json({
        success: true,
        message: "E-Commerce API",
        ...getVersionInfo(),
        endpoints: {
            current: `/api/${API_VERSION.CURRENT}`,
            health: "/health or /api/v1/health",
            docs: "https://github.com/org/ecommerce-backend#api-documentation",
        },
        deprecation: {
            message: "Unversioned /api/* routes are deprecated. Please use /api/v1/*",
            sunset: "Unversioned routes will be removed in a future major version",
        },
    });
});

app.use(`/api/${API_VERSION.CURRENT}`, setApiVersionHeader(API_VERSION.CURRENT), v1Router);

app.use('/api/:version', (req, res, next) => {
    const version = req.params.version;
    if (/^v\d+$/i.test(version)) {
        const normalized = version.toLowerCase();
        const supported = API_VERSION.SUPPORTED as readonly string[];
        if (!supported.includes(normalized)) {
            res.status(400).json({
                success: false,
                message: `Unsupported API version: ${version}`,
                supportedVersions: [...supported],
                currentVersion: API_VERSION.CURRENT,
            });
            return;
        }
    }
    next();
});


app.use("/api", (req, res, next) => {
    if (/^\/api\/v\d+(\/|$)/i.test(req.originalUrl)) {
        return next();
    }
    return deprecatedApiWarning(req, res, () => v1Router(req, res, next));
});






app.use((req, res) => {
    const isApiRoute = req.originalUrl.startsWith('/api/');
    const isVersioned = req.originalUrl.startsWith(`/api/${API_VERSION.CURRENT}/`) || /^\/api\/v\d+\//i.test(req.originalUrl);
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        ...(isApiRoute && !isVersioned
            ? { hint: `Did you mean /api/${API_VERSION.CURRENT}${req.originalUrl.replace(/^\/api/, '')}?`, supportedVersions: [...API_VERSION.SUPPORTED], currentVersion: API_VERSION.CURRENT }
            : {}),
    });
});

app.use(errorMiddleware);

export default app;