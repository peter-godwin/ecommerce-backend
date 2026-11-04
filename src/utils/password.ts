import { AuthError } from './AuthError';

export function assertStrongPassword(password: unknown): asserts password is string {
    if (typeof password !== 'string' || password.length < 12) {
        throw new AuthError('Password must be at least 12 characters long', 400);
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        throw new AuthError('Password must include uppercase, lowercase, number, and symbol characters', 400);
    }
}
