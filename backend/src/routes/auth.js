
import express from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate Google OAuth URL - this matches frontend expectation /api/auth/google
router.get('/google', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    logger.info('Generated OAuth URL for client');
    res.json({ authUrl });
  } catch (error) {
    logger.error('Error generating OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// Handle Google OAuth callback - this matches frontend expectation /api/auth/google/callback
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    logger.info('Processing OAuth callback with code');

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    logger.info('Retrieved user info from Google:', { email: userInfo.email });

    // Find or create user
    let user = await User.findOne({ email: userInfo.email });
    
    if (!user) {
      user = new User({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        googleId: userInfo.id,
        gmailTokens: tokens,
        isEmailVerified: true
      });
      await user.save();
      logger.info(`New user created: ${user.email}`);
    } else {
      // Update existing user's tokens
      user.gmailTokens = tokens;
      user.picture = userInfo.picture;
      await user.save();
      logger.info(`User tokens updated: ${user.email}`);
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('Authentication successful, sending response');

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      token: jwtToken
    });

  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
