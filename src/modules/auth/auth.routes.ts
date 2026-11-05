import { Router } from 'express';
import * as authController from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.dto';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.get('/verify-email/:verificationToken', authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerificationEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.put('/reset-password/:resetToken', validate(resetPasswordSchema), authController.resetPassword);
router.post('/reset-password/:resetToken', validate(resetPasswordSchema), authController.resetPassword);

export default router;
