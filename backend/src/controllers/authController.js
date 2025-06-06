import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { logger, logError, logInfo } from '../utils/logger.js';
import { getAuthUrl, getTokens, oauth2Client } from '../../config/gmail.js';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    logInfo('New user registered', { email, userId: user._id });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    logError(error, { endpoint: 'register', email: req.body?.email });
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    logInfo('User logged in', { email, userId: user._id });

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    logError(error, { endpoint: 'login', email: req.body?.email });
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'getMe' });
    res.status(500).json({ error: 'Failed to get user data' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'updateProfile' });
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logInfo('Password changed', { userId: user._id, email: user.email });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'changePassword' });
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // TODO: Send email with reset link
    logInfo('Password reset requested', { email });

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    logError(error, { endpoint: 'requestPasswordReset', email: req.body?.email });
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logInfo('Password reset completed', { userId: user._id, email: user.email });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logError(error, { endpoint: 'resetPassword' });
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Initiate Google OAuth
export const initiateGoogleAuth = async (req, res) => {
  try {
    const authUrl = getAuthUrl();
    
    logInfo('Google OAuth initiated', { userId: req.user._id });
    
    res.json({
      authUrl,
      message: 'Redirect user to this URL for Google authentication'
    });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'initiateGoogleAuth' });
    res.status(500).json({ error: 'Failed to initiate Google authentication' });
  }
};

// Handle Google OAuth callback
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for tokens
    const tokens = await getTokens(code);
    
    // Store tokens in user record
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        gmailTokens: tokens,
        gmailConnected: true,
        gmailConnectedAt: new Date()
      },
      { new: true }
    );

    logInfo('Google OAuth completed', { 
      userId: user._id, 
      email: user.email,
      hasRefreshToken: !!tokens.refresh_token 
    });

    res.json({
      message: 'Gmail account connected successfully',
      user
    });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'handleGoogleCallback' });
    res.status(500).json({ error: 'Failed to complete Google authentication' });
  }
};

// Disconnect Gmail account
export const disconnectGmail = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        gmailTokens: undefined,
        gmailConnected: false,
        gmailConnectedAt: undefined
      },
      { new: true }
    );

    logInfo('Gmail account disconnected', { userId: user._id, email: user.email });

    res.json({
      message: 'Gmail account disconnected successfully',
      user
    });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'disconnectGmail' });
    res.status(500).json({ error: 'Failed to disconnect Gmail account' });
  }
};

// Check Gmail connection status
export const getGmailStatus = async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      connected: user.gmailConnected || false,
      connectedAt: user.gmailConnectedAt,
      hasTokens: !!user.gmailTokens
    });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'getGmailStatus' });
    res.status(500).json({ error: 'Failed to get Gmail status' });
  }
};

// Refresh Gmail tokens
export const refreshGmailTokens = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.gmailTokens || !user.gmailTokens.refresh_token) {
      return res.status(400).json({ error: 'No refresh token available. Please reconnect your Gmail account.' });
    }

    // Set the refresh token
    oauth2Client.setCredentials({
      refresh_token: user.gmailTokens.refresh_token
    });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update user with new tokens
    const updatedTokens = {
      ...user.gmailTokens,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    };

    await User.findByIdAndUpdate(user._id, { gmailTokens: updatedTokens });

    logInfo('Gmail tokens refreshed', { userId: user._id });

    res.json({
      message: 'Gmail tokens refreshed successfully',
      expiryDate: credentials.expiry_date
    });
  } catch (error) {
    logError(error, { userId: req.user?._id, endpoint: 'refreshGmailTokens' });
    res.status(500).json({ error: 'Failed to refresh Gmail tokens' });
  }
};
