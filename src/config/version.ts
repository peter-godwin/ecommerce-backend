import packageJson from '../../package.json';

export const PACKAGE_VERSION: string = packageJson.version || '1.0.0';

export const API_VERSION = {
    CURRENT: 'v1' as const,
    SUPPORTED: ['v1'] as const,
    DEFAULT: 'v1' as const,
};

export type ApiVersion = typeof API_VERSION.SUPPORTED[number];

export const API_HEADER = {
    VERSION: 'X-API-Version',
    DEPRECATED: 'Deprecation',
    SUNSET: 'Sunset',
    WARNING: 'Warning',
};


export const DEPRECATED_SUNSET_DATE = 'Tue, 31 Mar 2027 00:00:00 GMT';

export const getVersionInfo = () => ({
    current: API_VERSION.CURRENT,
    supported: [...API_VERSION.SUPPORTED],
    default: API_VERSION.DEFAULT,
    packageVersion: PACKAGE_VERSION,
});
