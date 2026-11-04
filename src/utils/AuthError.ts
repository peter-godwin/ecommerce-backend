export class AuthError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 401) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AuthError";
    }
}
