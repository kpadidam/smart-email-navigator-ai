import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import User from '../models/User.js';
import EmailAccount from '../models/EmailAccount.js';

/**
 * Gmail Service for handling Gmail API operations
 */
class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Get Gmail client for a user or email account
   * @param {Object} accountData - User object or EmailAccount object with Gmail tokens
   * @param {string} accountType - 'user' for primary account or 'email_account' for additional accounts
   * @returns {Object} Gmail API client
   */
  getGmailClient(accountData, accountType = 'user') {
    let tokens;
    
    if (accountType === 'user') {
      // Primary account from User model
      if (!accountData.gmailTokens || !accountData.gmailTokens.access_token) {
        throw new Error('User does not have valid Gmail tokens');
      }
      tokens = accountData.gmailTokens;
    } else {
      // Additional account from EmailAccount model
      if (!accountData.accessToken) {
        throw new Error('Email account does not have valid access token');
      }
      tokens = {
        access_token: accountData.accessToken,
        refresh_token: accountData.refreshToken,
        expiry_date: accountData.tokenExpiry ? accountData.tokenExpiry.getTime() : null
      };
    }

    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Refresh tokens for user or email account
   * @param {Object} accountData - User object or EmailAccount object
   * @param {string} accountType - 'user' for primary account or 'email_account' for additional accounts
   * @returns {Object} Updated account with fresh tokens
   */
  async refreshTokensIfNeeded(accountData, accountType = 'user') {
    let refreshToken, currentTokens, accountId;
    
    if (accountType === 'user') {
      if (!accountData.gmailTokens || !accountData.gmailTokens.refresh_token) {
        logger.error('No refresh token available for user', { userId: accountData._id });
        throw new Error('No refresh token available. Please reconnect your Gmail account.');
      }
      refreshToken = accountData.gmailTokens.refresh_token;
      currentTokens = accountData.gmailTokens;
      accountId = accountData._id;
    } else {
      if (!accountData.refreshToken) {
        logger.error('No refresh token available for email account', { accountId: accountData._id });
        throw new Error('No refresh token available. Please reconnect this email account.');
      }
      refreshToken = accountData.refreshToken;
      currentTokens = {
        access_token: accountData.accessToken,
        refresh_token: accountData.refreshToken,
        expiry_date: accountData.tokenExpiry ? accountData.tokenExpiry.getTime() : null
      };
      accountId = accountData._id;
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const now = Date.now();
    const expiryTime = currentTokens.expiry_date;
    const fiveMinutes = 5 * 60 * 1000;

    // Convert expiry_date to timestamp if it's a Date object
    let expiryTimestamp;
    if (expiryTime instanceof Date) {
      expiryTimestamp = expiryTime.getTime();
    } else if (typeof expiryTime === 'number') {
      expiryTimestamp = expiryTime;
    } else {
      logger.warn('Invalid expiry_date format, forcing refresh', { 
        accountId, 
        accountType,
        expiryTime, 
        type: typeof expiryTime 
      });
      expiryTimestamp = 0; // Force refresh
    }

    if (!expiryTimestamp || now >= (expiryTimestamp - fiveMinutes)) {
      try {
        logger.info('Refreshing Gmail tokens', { 
          accountId,
          accountType,
          expired: !expiryTimestamp || now >= expiryTimestamp,
          expiryTime: expiryTimestamp ? new Date(expiryTimestamp).toISOString() : 'unknown'
        });

        // Create a fresh OAuth client for token refresh
        const refreshClient = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        refreshClient.setCredentials({
          refresh_token: refreshToken
        });

        const { credentials } = await refreshClient.refreshAccessToken();
        
        // Update tokens based on account type
        if (accountType === 'user') {
          const updatedTokens = {
            ...currentTokens,
            access_token: credentials.access_token,
            expiry_date: credentials.expiry_date || (Date.now() + 3600000)
          };

          await User.findByIdAndUpdate(accountId, { gmailTokens: updatedTokens });
          accountData.gmailTokens = updatedTokens;
        } else {
          const updateData = {
            accessToken: credentials.access_token,
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600000)
          };

          await EmailAccount.findByIdAndUpdate(accountId, updateData);
          accountData.accessToken = updateData.accessToken;
          accountData.tokenExpiry = updateData.tokenExpiry;
        }

        logger.info('Gmail tokens refreshed successfully', { 
          accountId,
          accountType,
          newExpiry: new Date(credentials.expiry_date || (Date.now() + 3600000)).toISOString()
        });
      } catch (error) {
        logger.error('Failed to refresh Gmail tokens', { 
          accountId,
          accountType,
          error: error.message,
          errorCode: error.code,
          errorDetails: error.response?.data
        });

        // Provide specific error messages based on error type
        if (error.message.includes('invalid_grant')) {
          throw new Error('Gmail refresh token has expired or been revoked. Please reconnect your Gmail account.');
        } else if (error.message.includes('invalid_client')) {
          throw new Error('Gmail OAuth configuration error. Please contact support.');
        } else {
          throw new Error(`Failed to refresh Gmail tokens: ${error.message}`);
        }
      }
    }

    return accountData;
  }

  /**
   * List emails from Gmail for any account type
   * @param {Object} accountData - User object or EmailAccount object
   * @param {string} accountType - 'user' for primary account or 'email_account' for additional accounts
   * @param {Object} options - Query options
   * @returns {Array} List of emails
   */
  async listEmails(accountData, accountType = 'user', options = {}) {
    try {
      const updatedAccount = await this.refreshTokensIfNeeded(accountData, accountType);
      const gmail = this.getGmailClient(updatedAccount, accountType);

      const {
        maxResults = 50,
        pageToken = null,
        q = null,
        labelIds = null
      } = options;

      const params = {
        userId: 'me',
        maxResults,
        ...(pageToken && { pageToken }),
        ...(q && { q }),
        ...(labelIds && { labelIds })
      };

      const response = await gmail.users.messages.list(params);
      
      if (!response.data.messages) {
        return { emails: [], nextPageToken: null };
      }

      // Get detailed information for each message
      const emailPromises = response.data.messages.map(message =>
        gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        })
      );

      const emailResponses = await Promise.all(emailPromises);
      const emails = emailResponses.map(response => this.parseEmailData(response.data));

      return {
        emails,
        nextPageToken: response.data.nextPageToken || null
      };
    } catch (error) {
      const accountId = accountData._id;
      logger.error('Failed to list emails', { accountId, accountType, error: error.message });
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - uses User model
   */
  async listEmailsForUser(user, options = {}) {
    return this.listEmails(user, 'user', options);
  }

  /**
   * List emails for a specific email account
   */
  async listEmailsForAccount(emailAccount, options = {}) {
    return this.listEmails(emailAccount, 'email_account', options);
  }

  /**
   * Parse Gmail API email data into a standardized format
   * @param {Object} emailData - Raw Gmail API email data
   * @returns {Object} Parsed email data
   */
  parseEmailData(emailData) {
    const headers = emailData.payload.headers;
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : null;
    };

    // Extract body content
    let body = '';
    let htmlBody = '';
    
    const extractBody = (payload) => {
      if (payload.body && payload.body.data) {
        const content = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        if (payload.mimeType === 'text/plain') {
          body = content;
        } else if (payload.mimeType === 'text/html') {
          htmlBody = content;
        }
      }

      if (payload.parts) {
        payload.parts.forEach(part => extractBody(part));
      }
    };

    extractBody(emailData.payload);

    return {
      id: emailData.id,
      threadId: emailData.threadId,
      labelIds: emailData.labelIds || [],
      snippet: emailData.snippet,
      historyId: emailData.historyId,
      internalDate: new Date(parseInt(emailData.internalDate)),
      subject: getHeader('Subject') || '(No Subject)',
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      bcc: getHeader('Bcc'),
      date: getHeader('Date'),
      messageId: getHeader('Message-ID'),
      body: body || htmlBody,
      htmlBody,
      textBody: body,
      isRead: !emailData.labelIds?.includes('UNREAD'),
      isImportant: emailData.labelIds?.includes('IMPORTANT'),
      isStarred: emailData.labelIds?.includes('STARRED')
    };
  }
}

export default new GmailService();
