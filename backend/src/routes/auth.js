import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  initiateGoogleAuth,
  handleGoogleCallback,
  disconnectGmail,
  getGmailStatus,
  refreshGmailTokens
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

// Google OAuth routes
router.get('/google/login', authenticate, initiateGoogleAuth);
router.post('/google/callback', authenticate, handleGoogleCallback);
router.post('/google/disconnect', authenticate, disconnectGmail);
router.get('/google/status', authenticate, getGmailStatus);
router.post('/google/refresh', authenticate, refreshGmailTokens);

export default router;
