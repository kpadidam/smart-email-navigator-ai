import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import User from '../models/User.js';

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
   * Get Gmail client for a user
   * @param {Object} user - User object with Gmail tokens
   * @returns {Object} Gmail API client
   */
  getGmailClient(user) {
    if (!user.gmailTokens || !user.gmailTokens.access_token) {
      throw new Error('User does not have valid Gmail tokens');
    }

    this.oauth2Client.setCredentials({
      access_token: user.gmailTokens.access_token,
      refresh_token: user.gmailTokens.refresh_token,
      expiry_date: user.gmailTokens.expiry_date
    });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Refresh user's Gmail tokens if needed
   * @param {Object} user - User object
   * @returns {Object} Updated user with fresh tokens
   */
  async refreshTokensIfNeeded(user) {
    if (!user.gmailTokens || !user.gmailTokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const now = Date.now();
    const expiryTime = user.gmailTokens.expiry_date;
    const fiveMinutes = 5 * 60 * 1000;

    if (expiryTime && now >= (expiryTime - fiveMinutes)) {
      try {
        this.oauth2Client.setCredentials({
          refresh_token: user.gmailTokens.refresh_token
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update user with new tokens
        const updatedTokens = {
          ...user.gmailTokens,
          access_token: credentials.access_token,
          expiry_date: credentials.expiry_date
        };

        await User.findByIdAndUpdate(user._id, { gmailTokens: updatedTokens });
        user.gmailTokens = updatedTokens;

        logger.info('Gmail tokens refreshed', { userId: user._id });
      } catch (error) {
        logger.error('Failed to refresh Gmail tokens', { userId: user._id, error: error.message });
        throw new Error('Failed to refresh Gmail tokens');
      }
    }

    return user;
  }

  /**
   * List emails from Gmail
   * @param {Object} user - User object
   * @param {Object} options - Query options
   * @returns {Array} List of emails
   */
  async listEmails(user, options = {}) {
    try {
      const updatedUser = await this.refreshTokensIfNeeded(user);
      const gmail = this.getGmailClient(updatedUser);

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
      logger.error('Failed to list emails', { userId: user._id, error: error.message });
      throw error;
    }
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
