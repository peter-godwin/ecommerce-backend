import request from "supertest";
import app from "../../src/app";
import { User } from "../../src/modules/user/user.model";

jest.mock("../../src/utils/email", () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
}));

describe("User Module - Auth", () => {
    const testUser = {
        name: "Peter Godwin",
        email: "godwinpete@example.com",
        password: "Password123!@#",
    };

    it("should register a new user", async () => {
        const res = await request(app)
            .post("/api/v1/auth/register")
            .send(testUser);

        expect(res.statusCode).toBe(201);
        expect(res.body.user).toHaveProperty("_id");
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body).toHaveProperty("token");
    });

    it("should not allow duplicate registration", async () => {
        const res = await request(app)
            .post("/api/v1/auth/register")
            .send(testUser);

        expect(res.statusCode).toBe(409);
        expect(res.body.message).toBe("Email already registered");
    });

    it("should login with correct credentials", async () => {
        await User.updateOne({ email: testUser.email }, { isEmailVerified: true });

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: testUser.email, password: testUser.password });

        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body).toHaveProperty("token");
    });

    it("should fail login with wrong password", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: testUser.email, password: "WrongPassword123!@#" });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("Invalid credentials");
    });
});
