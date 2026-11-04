import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: "user" | "admin";
    isEmailVerified: boolean;
    isActive: boolean;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
    };
    avatar?: string;
    lastLogin?: Date;
    stripeCustomerId?: string;
    loginAttempts: number;
    lockUntil?: Date;
    tokenVersion: number;
    emailVerificationToken?: string;
    emailVerificationExpire?: Date;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    getResetPasswordToken(): string;
    getEmailVerificationToken(): string;
    incLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [12, 'Password must be at least 12 characters'],
            select: false
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        },
        phone: {
            type: String,
            trim: true,
            match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
        },
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            zipCode: String
        },
        avatar: String,
        lastLogin: Date,
        stripeCustomerId: String,
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: Date,
        tokenVersion: {
            type: Number,
            default: 0,
            select: false,
        },
        emailVerificationToken: String,
        emailVerificationExpire: Date,
        resetPasswordToken: String,
        resetPasswordExpire: Date,
    },
    { timestamps: true }
);

UserSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > new Date());
});

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ isActive: 1 });

UserSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    if (!this.isNew) {
        this.tokenVersion += 1;
    }
});

UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.getResetPasswordToken = function (): string {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

    return resetToken;
};

UserSchema.methods.getEmailVerificationToken = function (): string {
    const verificationToken = crypto.randomBytes(20).toString('hex');

    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return verificationToken;
};

UserSchema.methods.incLoginAttempts = async function (): Promise<void> {
    if (this.lockUntil && this.lockUntil < new Date()) {
        await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
        return;
    }

    const updates: { $inc: { loginAttempts: number }; $set?: { lockUntil?: Date } } = { $inc: { loginAttempts: 1 } };

    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000;

    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
    }

    await this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
    await this.updateOne({
        $set: { loginAttempts: 0, lastLogin: new Date() },
        $unset: { lockUntil: 1 }
    });
};

export const User = mongoose.model<IUser>("User", UserSchema);
