import request from "supertest";
import app from "../../src/app";

describe("User Module - Auth", () => {
    const testUser = {
        name: "Peter Godwin",
        email: "godwinpete@example.com",
        password: "password123",
    };

    it("should register a new user", async () => {
        const res = await request(app)
            .post("/api/users/register")
            .send(testUser);

        expect(res.statusCode).toBe(201);
        expect(res.body.user).toHaveProperty("_id");
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body).toHaveProperty("token");
    });

    it("should not allow duplicate registration", async () => {
        const res = await request(app)
            .post("/api/users/register")
            .send(testUser);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Email already exists");
    });

    it("should login with correct credentials", async () => {
        const res = await request(app)
            .post("/api/users/login")
            .send({ email: testUser.email, password: testUser.password });

        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body).toHaveProperty("token");
    });

    it("should fail login with wrong password", async () => {
        const res = await request(app)
            .post("/api/users/login")
            .send({ email: testUser.email, password: "wrongpass" });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("Invalid credentials");
    });
});
