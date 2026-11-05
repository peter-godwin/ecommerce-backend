import { z, AnyZodObject } from "zod/v3";

export const registerSchema: AnyZodObject = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        password: z.string().min(8).max(100),
    }),
});

export const loginSchema: AnyZodObject = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(1).max(100),
    }),
});

export const resendVerificationSchema: AnyZodObject = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const forgotPasswordSchema: AnyZodObject = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const resetPasswordSchema: AnyZodObject = z.object({
    body: z.object({
        password: z.string().min(8).max(100),
    }),
    params: z.object({
        resetToken: z.string().min(1),
    }),
});
