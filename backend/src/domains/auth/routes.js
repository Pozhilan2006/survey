import express from 'express';
import { login, register } from './controller.js';
import { changePassword, requestPasswordReset, resetPassword } from './passwordController.js';
import { refreshToken, logout } from './refreshController.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

export default router;
