import mongoose, { Document, Schema, Types } from 'mongoose';
import {IRefreshToken} from "../../types/refreshToken";


const RefreshTokenSchema = new Schema<IRefreshToken>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        tokenHash: { type: String, required: true, unique: true, select: false },
        expiresAt: { type: Date, required: true },
        revokedAt: Date,
    },
    { timestamps: true },
);


RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
