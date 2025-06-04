import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, requestPasswordReset);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
