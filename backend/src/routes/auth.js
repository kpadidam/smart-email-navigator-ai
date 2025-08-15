import express from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import userService from '../services/userService.js';
import emailAccountService from '../services/emailAccountService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Handle preflight requests
router.options('/google', (req, res) => {
  res.status(204).end();
});

router.options('/google/callback', (req, res) => {
  res.status(204).end();
});

// Generate Google OAuth URL - this matches frontend expectation /api/auth/google
router.get('/google', (req, res) => {
  try {
    logger.info('Initiating Google OAuth flow', {
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set',
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      origin: req.headers.origin
    });

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      logger.error('Missing Google OAuth credentials', {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI
      });
      return res.status(500).json({ error: 'Server configuration error: Missing OAuth credentials' });
    }

    // Create OAuth2 client with explicit configuration
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI // Explicitly set redirect_uri
    });

    logger.info('Generated OAuth URL successfully', { 
      authUrl,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    res.json({ authUrl });
  } catch (error) {
    logger.error('Error generating OAuth URL:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// Handle Google OAuth callback (GET request from Google's redirect)
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    logger.info('Received OAuth callback', { 
      hasCode: !!code,
      hasError: !!error,
      state
    });

    // Handle OAuth error from Google
    if (error) {
      logger.error('OAuth error from Google', { error });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      logger.warn('OAuth callback received without code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/login?error=no_code`);
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      logger.error('Missing Google OAuth credentials in callback');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/login?error=server_config`);
    }

    // Check if this is for adding an account
    const isAddAccountFlow = state && state.startsWith('add_account:');
    const userId = isAddAccountFlow ? state.replace('add_account:', '') : null;

    // Create OAuth2 client for callback
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    logger.info('Exchanging code for tokens', { isAddAccountFlow, userId });
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    logger.info('Getting user info from Google');
    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    logger.info('Retrieved user info from Google', { 
      email: userInfo.email,
      isAddAccountFlow,
      userId
    });

    if (isAddAccountFlow) {
      // Handle adding account to existing user
      if (!userId) {
        logger.error('Missing userId for add account flow');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/?error=missing_user_id`);
      }

      // Verify user exists
      const user = await userService.findById(userId);
      if (!user) {
        logger.error('User not found for adding account', { userId });
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/?error=user_not_found`);
      }

      // Check if this email account is already connected to any user
      const existingAccount = await emailAccountService.existsByEmail(userInfo.email);
      if (existingAccount) {
        logger.warn('Email account already connected', { email: userInfo.email });
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/?error=account_already_exists`);
      }

      // Create new email account record
      const emailAccount = await emailAccountService.create({
        userId: user.id,
        email: userInfo.email,
        provider: 'GMAIL',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true
      });
      logger.info('Email account added successfully', { 
        userId: user.id,
        email: userInfo.email,
        accountId: emailAccount.id
      });

      // Redirect back to frontend with success message
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      res.redirect(`${frontendUrl}/?account_added=success&email=${encodeURIComponent(userInfo.email)}`);

    } else {
      // Handle regular login flow
      
      // Parse name into firstName and lastName
      const fullName = userInfo.name || '';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Find or create user
      let user = await userService.findByEmail(userInfo.email);
      
      if (!user) {
        logger.info('Creating new user', { email: userInfo.email, firstName, lastName });
        user = await userService.create({
          email: userInfo.email,
          firstName: firstName || 'Unknown',
          lastName: lastName || 'User',
          name: userInfo.name,
          picture: userInfo.picture,
          googleId: userInfo.id,
          gmailTokens: tokens,
          gmailConnected: true,
          gmailConnectedAt: new Date(),
          isEmailVerified: true
        });
        logger.info('New user created successfully', { userId: user.id });
      } else {
        logger.info('Updating existing user', { userId: user.id });
        // Update existing user's tokens and info
        user = await userService.update(user.id, {
          gmailTokens: tokens,
          gmailConnected: true,
          gmailConnectedAt: new Date(),
          picture: userInfo.picture,
          name: userInfo.name,
          firstName: user.firstName || firstName || 'Unknown',
          lastName: user.lastName || lastName || 'User'
        });
        logger.info('User tokens updated successfully', { userId: user.id });
      }

      // Generate JWT token
      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info('Authentication successful', {
        userId: user.id,
        email: user.email
      });

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      res.redirect(`${frontendUrl}/login?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }))}`);
    }

  } catch (error) {
    logger.error('OAuth callback error:', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
});

// Handle Google OAuth callback - this matches frontend expectation /api/auth/google/callback (POST for manual calls)
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    logger.info('Received OAuth callback via POST', { 
      hasCode: !!code,
      origin: req.headers.origin
    });

    if (!code) {
      logger.warn('OAuth callback received without code');
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      logger.error('Missing Google OAuth credentials in callback');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create OAuth2 client for callback
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    logger.info('Exchanging code for tokens');
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    logger.info('Getting user info from Google');
    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    logger.info('Retrieved user info from Google', { 
      email: userInfo.email,
      hasPicture: !!userInfo.picture,
      hasName: !!userInfo.name
    });

    // Find or create user
    let user = await userService.findByEmail(userInfo.email);
    
    if (!user) {
      logger.info('Creating new user', { email: userInfo.email });
      
      // Parse name into firstName and lastName
      const fullName = userInfo.name || '';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      user = await userService.create({
        email: userInfo.email,
        firstName: firstName || 'Unknown',
        lastName: lastName || 'User',
        name: userInfo.name,
        picture: userInfo.picture,
        googleId: userInfo.id,
        gmailTokens: tokens,
        gmailConnected: true,
        gmailConnectedAt: new Date(),
        isEmailVerified: true
      });
      logger.info('New user created successfully', { userId: user.id });
    } else {
      logger.info('Updating existing user', { userId: user.id });
      // Update existing user's tokens
      user = await userService.update(user.id, {
        gmailTokens: tokens,
        gmailConnected: true,
        gmailConnectedAt: new Date(),
        picture: userInfo.picture,
        name: userInfo.name
      });
      logger.info('User tokens updated successfully', { userId: user.id });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('Authentication successful', {
      userId: user.id,
      email: user.email
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      token: jwtToken
    });

  } catch (error) {
    logger.error('OAuth callback error:', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Note: Google OAuth callback above handles both regular login and adding accounts
// by checking the 'state' parameter. If state starts with 'add_account:', it's treated
// as adding an account to an existing user. Otherwise, it's regular login/signup.

// Add email account to existing user (requires authentication)
router.get('/add-account/google', async (req, res) => {
  try {
    // This is for adding accounts to an already authenticated user
    // We need to include the user ID in the state to link the account properly
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for adding accounts' });
    }

    logger.info('Initiating Google OAuth for adding account', {
      userId,
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      logger.error('Missing Google OAuth credentials for add account');
      return res.status(500).json({ error: 'Server configuration error: Missing OAuth credentials' });
    }

    // Create OAuth2 client for adding account (same callback, different state)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI // Same callback as regular OAuth
    );

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: `add_account:${userId}`, // Prefix to distinguish from regular login
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });

    logger.info('Generated OAuth URL for adding account', { authUrl });
    res.json({ authUrl });
  } catch (error) {
    logger.error('Error generating OAuth URL for adding account:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL for adding account' });
  }
});

export default router;
