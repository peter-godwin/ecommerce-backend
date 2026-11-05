import request from "supertest";
import app from "../../src/app";
import { User } from "../../src/modules/user/user.model";

jest.mock("../../src/utils/email", () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/modules/user/user.model", () => {
    const UserMock = jest.fn();
    UserMock.findOne = jest.fn();
    UserMock.create = jest.fn();
    UserMock.updateOne = jest.fn();
    return { User: UserMock };
});

jest.mock("../../src/modules/auth/refresh-token.model", () => {
    const RefreshTokenMock = { create: jest.fn().mockResolvedValue({ token: "mock-refresh-token" }) };
    return { RefreshToken: RefreshTokenMock };
});

describe("User Module - Auth", () => {
    const testUser = {
        name: "Peter Godwin",
        email: "godwinpete@example.com",
        password: "Password123!@#",
    };

    const mockUser = {
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        tokenVersion: 0,
        role: "user",
        isActive: true,
        isEmailVerified: true,
        lockUntil: null,
        comparePassword: jest.fn().mockResolvedValue(true),
        getEmailVerificationToken: jest.fn().mockReturnValue("mock-verification-token"),
        save: jest.fn().mockResolvedValue(undefined),
        resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
        incLoginAttempts: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
            _id: { toString: () => "507f1f77bcf86cd799439011" },
            name: "Peter Godwin",
            email: "godwinpete@example.com",
            role: "user",
            isEmailVerified: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        }),
    };

    const makeUserQuery = (resolvedValue: unknown) => {
        const query = Promise.resolve(resolvedValue) as Promise<unknown> & { select: jest.Mock };
        query.select = jest.fn().mockResolvedValue(resolvedValue);
        return query;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should register a new user", async () => {
        (User.findOne as jest.Mock).mockImplementation(() => makeUserQuery(null));
        (User.create as jest.Mock).mockResolvedValue(mockUser);

        const res = await request(app)
            .post("/api/v1/auth/register")
            .send(testUser);

        expect(res.statusCode).toBe(201);
        expect(res.body.user).toHaveProperty("_id");
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body).toHaveProperty("token");
    });

    it("should not allow duplicate registration", async () => {
        (User.findOne as jest.Mock).mockImplementation(() => makeUserQuery(mockUser));

        const res = await request(app)
            .post("/api/v1/auth/register")
            .send(testUser);

        expect(res.statusCode).toBe(409);
        expect(res.body.message).toBe("Email already registered");
    });

    it("should login with correct credentials", async () => {
        (User.findOne as jest.Mock).mockImplementation(() => makeUserQuery(mockUser));

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: testUser.email, password: testUser.password });

        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body).toHaveProperty("token");
    });

    it("should fail login with wrong password", async () => {
        (User.findOne as jest.Mock).mockImplementation(() => makeUserQuery(mockUser));
        mockUser.comparePassword.mockResolvedValue(false);

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: testUser.email, password: "WrongPassword123!@#" });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("Invalid credentials");
    });
});
