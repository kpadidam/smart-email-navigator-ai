import { getGmailClient } from '../../config/gmail.js';
import { logger } from '../utils/logger.js';

export class GmailService {
  constructor(accessToken, refreshToken) {
    this.gmail = getGmailClient(accessToken, refreshToken);
  }

  // Get user's Gmail profile
  async getProfile() {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      logger.error('Error getting Gmail profile:', error);
      throw new Error('Failed to get Gmail profile');
    }
  }

  // List messages with optional query
  async listMessages(query = '', maxResults = 50, pageToken = null) {
    try {
      const params = {
        userId: 'me',
        q: query,
        maxResults,
        ...(pageToken && { pageToken })
      };

      const response = await this.gmail.users.messages.list(params);
      return response.data;
    } catch (error) {
      logger.error('Error listing Gmail messages:', error);
      throw new Error('Failed to list Gmail messages');
    }
  }

  // Get a specific message
  async getMessage(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      return response.data;
    } catch (error) {
      logger.error(`Error getting Gmail message ${messageId}:`, error);
      throw new Error('Failed to get Gmail message');
    }
  }

  // Get message attachment
  async getAttachment(messageId, attachmentId) {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      });
      return response.data;
    } catch (error) {
      logger.error(`Error getting attachment ${attachmentId}:`, error);
      throw new Error('Failed to get attachment');
    }
  }

  // Send an email
  async sendMessage(to, subject, body, attachments = []) {
    try {
      const email = this.createEmailMessage(to, subject, body, attachments);
      
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: email
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error sending Gmail message:', error);
      throw new Error('Failed to send Gmail message');
    }
  }

  // Mark message as read
  async markAsRead(messageId) {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error marking message ${messageId} as read:`, error);
      throw new Error('Failed to mark message as read');
    }
  }

  // Mark message as unread
  async markAsUnread(messageId) {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD']
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error marking message ${messageId} as unread:`, error);
      throw new Error('Failed to mark message as unread');
    }
  }

  // Star/unstar message
  async toggleStar(messageId, starred) {
    try {
      const labelIds = starred ? ['STARRED'] : [];
      const removeLabelIds = starred ? [] : ['STARRED'];

      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          ...(labelIds.length && { addLabelIds: labelIds }),
          ...(removeLabelIds.length && { removeLabelIds })
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error toggling star for message ${messageId}:`, error);
      throw new Error('Failed to toggle star');
    }
  }

  // Create email message for sending
  createEmailMessage(to, subject, body, attachments = []) {
    const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);
    
    let email = [
      'Content-Type: multipart/mixed; boundary="' + boundary + '"',
      'MIME-Version: 1.0',
      'To: ' + to,
      'Subject: ' + subject,
      '',
      '--' + boundary,
      'Content-Type: text/html; charset="UTF-8"',
      'MIME-Version: 1.0',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      ''
    ];

    // Add attachments if any
    attachments.forEach(attachment => {
      email = email.concat([
        '--' + boundary,
        'Content-Type: ' + attachment.mimeType,
        'MIME-Version: 1.0',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment; filename="' + attachment.filename + '"',
        '',
        attachment.data,
        ''
      ]);
    });

    email.push('--' + boundary + '--');

    return Buffer.from(email.join('\r\n')).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
