import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

jest.setTimeout(30000);
beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});
