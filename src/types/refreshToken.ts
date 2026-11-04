import {Document, Types} from "mongoose";

export interface IRefreshToken extends Document {
    user: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}