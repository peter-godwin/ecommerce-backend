import { Request, Response, NextFunction } from 'express';
import { API_HEADER, API_VERSION, DEPRECATED_SUNSET_DATE } from '../config/version';


export const setApiVersionHeader = (version: string) => {
    return (_req: Request, res: Response, next: NextFunction): void => {
        res.setHeader(API_HEADER.VERSION, version);
        next();
    };
};


export const deprecatedApiWarning = (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader(API_HEADER.DEPRECATED, 'true');
    res.setHeader(API_HEADER.SUNSET, DEPRECATED_SUNSET_DATE);
    res.setHeader(API_HEADER.VERSION, API_VERSION.CURRENT);
    res.setHeader(
        API_HEADER.WARNING,
        `299 - "Deprecated API: Use /api/${API_VERSION.CURRENT} instead. Unversioned routes will be removed after ${DEPRECATED_SUNSET_DATE}"`
    );

    if (process.env.NODE_ENV !== 'production') {
        console.warn(
            `Deprecated API access: ${_req.method} ${_req.originalUrl} - Please migrate to /api/${API_VERSION.CURRENT}${_req.originalUrl.replace(/^\/api/, '')}`
        );
    }

    next();
};


export const validateApiVersion = (req: Request, res: Response, next: NextFunction): void => {
    const version = req.params.version as string;

    if (!version) {
        next();
        return;
    }

    const normalized = version.toLowerCase();

    if (!(API_VERSION.SUPPORTED as readonly string[]).includes(normalized)) {
        res.status(400).json({
            success: false,
            message: `Unsupported API version: ${version}`,
            supportedVersions: [...API_VERSION.SUPPORTED],
            currentVersion: API_VERSION.CURRENT,
        });
        return;
    }

    res.setHeader(API_HEADER.VERSION, normalized);
    next();
};


export const apiVersionNegotiator = (req: Request, res: Response, next: NextFunction): void => {
    const headerVersion = req.headers['x-api-version'] as string | undefined;
    const acceptHeader = req.headers.accept as string | undefined;

    let requestedVersion: string | undefined;

    if (headerVersion) {
        requestedVersion = headerVersion.toLowerCase();
    } else if (acceptHeader && acceptHeader.includes('application/vnd.ecommerce.')) {
        const match = acceptHeader.match(/application\/vnd\.ecommerce\.(v\d+)\+json/);
        if (match && match[1]) {
            requestedVersion = match[1].toLowerCase();
        }
    }

    if (requestedVersion) {
        const supportedVersions = API_VERSION.SUPPORTED as readonly string[];

        if (!supportedVersions.includes(requestedVersion)) {
            res.status(406).json({
                success: false,
                message: `Unsupported API version: ${requestedVersion}`,
                supportedVersions: [...API_VERSION.SUPPORTED],
                currentVersion: API_VERSION.CURRENT,
            });
            return;
        }

        const pathVersion = req.path.match(/^\/api\/(v\d+)(?:\/|$)/i)?.[1]?.toLowerCase();
        if (pathVersion && pathVersion !== requestedVersion) {
            res.status(400).json({
                success: false,
                message: 'API version header does not match the requested URL version',
                requestedVersion,
                pathVersion,
            });
            return;
        }

        (req as Request & { requestedApiVersion?: string }).requestedApiVersion = requestedVersion;
    }

    next();
};
