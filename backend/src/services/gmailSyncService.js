import { getGmailClient } from '../../config/gmail.js';
import EmailAccount from '../models/EmailAccount.js';
import Email from '../models/Email.js';
import { logger, logInfo, logError } from '../utils/logger.js';
import { realtimeEmailService } from './realtimeEmailService.js';

class GmailSyncService {
  constructor() {
    this.isProcessing = new Map(); // Track processing status per account
  }

  // Main sync method for a user's email account
  async syncAccount(userId, accountId) {
    try {
      // Prevent concurrent syncing of the same account
      if (this.isProcessing.get(accountId)) {
        logInfo('Account sync already in progress', { userId, accountId });
        return { status: 'already_syncing' };
      }

      this.isProcessing.set(accountId, true);

      // Get email account with tokens
      const account = await EmailAccount.findOne({
        _id: accountId,
        userId,
        isActive: true
      }).select('+googleTokens');

      if (!account) {
        throw new Error('Email account not found or inactive');
      }

      // Check if tokens are valid
      if (!account.isTokenValid) {
        throw new Error('Gmail tokens expired, re-authentication required');
      }

      // Initialize Gmail client
      const gmail = getGmailClient(
        account.googleTokens.accessToken,
        account.googleTokens.refreshToken
      );

      // Update sync status
      await realtimeEmailService.updateSyncStatus(userId, accountId, {
        status: 'syncing',
        message: 'Starting email sync...'
      });

      // Get last sync date to fetch only new emails
      const lastSyncAt = account.stats.lastSyncAt;
      const query = this.buildGmailQuery(lastSyncAt);

      logInfo('Starting Gmail sync', { 
        userId, 
        accountId, 
        lastSyncAt,
        query 
      });

      // Fetch email list from Gmail
      const emailList = await this.fetchEmailList(gmail, query, account.syncSettings.maxEmails);
      
      if (emailList.length === 0) {
        await account.updateSyncStats('success', account.stats.totalEmails, account.stats.unreadEmails);
        await realtimeEmailService.updateSyncStatus(userId, accountId, {
          status: 'completed',
          message: 'No new emails to sync'
        });
        return { status: 'no_new_emails', count: 0 };
      }

      // Fetch full email details in batches
      const batchSize = 10;
      const processedEmails = [];
      let totalProcessed = 0;

      for (let i = 0; i < emailList.length; i += batchSize) {
        const batch = emailList.slice(i, i + batchSize);
        const batchEmails = await this.fetchEmailBatch(gmail, batch);
        
        // Process and save emails
        for (const emailData of batchEmails) {
          try {
            const processedEmail = await this.processAndSaveEmail(userId, accountId, emailData);
            if (processedEmail) {
              processedEmails.push(processedEmail);
              totalProcessed++;

              // Emit real-time update for each email
              await realtimeEmailService.processEmail(userId, processedEmail);
            }
          } catch (emailError) {
            logError(emailError, { 
              userId, 
              accountId, 
              gmailId: emailData.id,
              service: 'GmailSyncService.processEmail' 
            });
          }
        }

        // Update progress
        await realtimeEmailService.updateSyncStatus(userId, accountId, {
          status: 'syncing',
          message: `Processed ${totalProcessed} of ${emailList.length} emails`,
          progress: Math.round((totalProcessed / emailList.length) * 100)
        });
      }

      // Update account statistics
      const totalEmails = await Email.countDocuments({ userId });
      const unreadEmails = await Email.countDocuments({ userId, isRead: false });
      
      await account.updateSyncStats('success', totalEmails, unreadEmails);

      // Emit batch completion and dashboard update
      await realtimeEmailService.processBatch(userId, processedEmails, accountId);
      await realtimeEmailService.updateDashboard(userId, {
        totalEmails,
        unreadEmails,
        lastSyncAt: new Date(),
        newEmailsCount: totalProcessed
      });

      await realtimeEmailService.updateSyncStatus(userId, accountId, {
        status: 'completed',
        message: `Successfully synced ${totalProcessed} emails`
      });

      logInfo('Gmail sync completed', { 
        userId, 
        accountId, 
        totalProcessed,
        totalEmails,
        unreadEmails 
      });

      return { 
        status: 'success', 
        count: totalProcessed,
        totalEmails,
        unreadEmails 
      };

    } catch (error) {
      logError(error, { 
        userId, 
        accountId, 
        service: 'GmailSyncService.syncAccount' 
      });

      // Update account with error status
      const account = await EmailAccount.findById(accountId);
      if (account) {
        await account.updateSyncStats('error', null, null, error.message);
      }

      // Emit error status
      await realtimeEmailService.updateSyncStatus(userId, accountId, {
        status: 'error',
        message: error.message
      });

      throw error;
    } finally {
      this.isProcessing.delete(accountId);
    }
  }

  // Build Gmail API query based on last sync date
  buildGmailQuery(lastSyncAt) {
    let query = 'in:inbox OR in:sent';
    
    if (lastSyncAt) {
      // Format date for Gmail API (YYYY/MM/DD)
      const date = new Date(lastSyncAt);
      const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      query += ` after:${formattedDate}`;
    }
    
    return query;
  }

  // Fetch email list from Gmail API
  async fetchEmailList(gmail, query, maxResults = 100) {
    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      return response.data.messages || [];
    } catch (error) {
      logError(error, { service: 'GmailSyncService.fetchEmailList', query });
      throw new Error(`Failed to fetch email list: ${error.message}`);
    }
  }

  // Fetch full email details for a batch of emails
  async fetchEmailBatch(gmail, emailList) {
    const emails = [];
    
    for (const emailRef of emailList) {
      try {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: emailRef.id,
          format: 'full'
        });
        
        emails.push(response.data);
      } catch (error) {
        logError(error, { 
          service: 'GmailSyncService.fetchEmailBatch',
          emailId: emailRef.id 
        });
      }
    }
    
    return emails;
  }

  // Process and save individual email
  async processAndSaveEmail(userId, accountId, gmailData) {
    try {
      // Check if email already exists
      const existingEmail = await Email.findOne({ 
        userId, 
        gmailId: gmailData.id 
      });

      if (existingEmail) {
        return null; // Skip if already processed
      }

      // Parse email data
      const emailData = this.parseGmailData(gmailData);
      
      // Create email document
      const email = new Email({
        userId,
        gmailId: gmailData.id,
        threadId: gmailData.threadId,
        subject: emailData.subject,
        from: emailData.from,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        body: emailData.body,
        snippet: gmailData.snippet,
        labels: gmailData.labelIds || [],
        category: this.categorizeEmail(emailData), // Basic categorization
        isRead: !gmailData.labelIds?.includes('UNREAD'),
        isStarred: gmailData.labelIds?.includes('STARRED'),
        isImportant: gmailData.labelIds?.includes('IMPORTANT'),
        hasAttachments: this.hasAttachments(gmailData),
        attachments: this.parseAttachments(gmailData),
        receivedAt: new Date(parseInt(gmailData.internalDate)),
        sentAt: emailData.sentAt
      });

      await email.save();
      
      logInfo('Email processed and saved', { 
        userId, 
        emailId: email._id,
        gmailId: gmailData.id,
        subject: emailData.subject 
      });

      return email;
    } catch (error) {
      logError(error, { 
        userId, 
        accountId,
        gmailId: gmailData.id,
        service: 'GmailSyncService.processAndSaveEmail' 
      });
      throw error;
    }
  }

  // Parse Gmail API data into our email format
  parseGmailData(gmailData) {
    const headers = gmailData.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Parse email addresses
    const parseEmailAddress = (addressString) => {
      if (!addressString) return null;
      
      const match = addressString.match(/^(.+?)\s*<(.+?)>$/) || [null, addressString, addressString];
      return {
        name: match[1]?.trim().replace(/"/g, '') || '',
        email: (match[2] || addressString).trim()
      };
    };

    const parseEmailList = (addressString) => {
      if (!addressString) return [];
      return addressString.split(',').map(addr => parseEmailAddress(addr.trim())).filter(Boolean);
    };

    // Extract body content
    const extractBody = (payload) => {
      let textBody = '';
      let htmlBody = '';

      const extractFromPart = (part) => {
        if (part.mimeType === 'text/plain' && part.body.data) {
          textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          part.parts.forEach(extractFromPart);
        }
      };

      if (payload.parts) {
        payload.parts.forEach(extractFromPart);
      } else if (payload.body.data) {
        if (payload.mimeType === 'text/plain') {
          textBody = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        } else if (payload.mimeType === 'text/html') {
          htmlBody = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
      }

      return { text: textBody, html: htmlBody };
    };

    return {
      subject: getHeader('Subject'),
      from: parseEmailAddress(getHeader('From')),
      to: parseEmailList(getHeader('To')),
      cc: parseEmailList(getHeader('Cc')),
      bcc: parseEmailList(getHeader('Bcc')),
      body: extractBody(gmailData.payload),
      sentAt: new Date(getHeader('Date'))
    };
  }

  // Basic email categorization
  categorizeEmail(emailData) {
    const subject = emailData.subject.toLowerCase();
    const fromEmail = emailData.from.email.toLowerCase();

    // Social media patterns
    if (fromEmail.includes('facebook') || fromEmail.includes('twitter') || 
        fromEmail.includes('linkedin') || fromEmail.includes('instagram')) {
      return 'social';
    }

    // Promotional patterns
    if (subject.includes('sale') || subject.includes('offer') || 
        subject.includes('discount') || subject.includes('deal') ||
        fromEmail.includes('noreply') || fromEmail.includes('marketing')) {
      return 'promotions';
    }

    // Updates/notifications
    if (subject.includes('notification') || subject.includes('update') ||
        subject.includes('reminder') || subject.includes('alert')) {
      return 'updates';
    }

    // Default to primary
    return 'primary';
  }

  // Check if email has attachments
  hasAttachments(gmailData) {
    const checkParts = (parts) => {
      if (!parts) return false;
      return parts.some(part => 
        part.filename && part.filename.length > 0 ||
        (part.parts && checkParts(part.parts))
      );
    };

    return checkParts(gmailData.payload.parts);
  }

  // Parse email attachments
  parseAttachments(gmailData) {
    const attachments = [];
    
    const extractAttachments = (parts) => {
      if (!parts) return;
      
      parts.forEach(part => {
        if (part.filename && part.filename.length > 0) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        }
        
        if (part.parts) {
          extractAttachments(part.parts);
        }
      });
    };

    extractAttachments(gmailData.payload.parts);
    return attachments;
  }

  // Sync all active accounts for a user
  async syncAllUserAccounts(userId) {
    try {
      const accounts = await EmailAccount.find({
        userId,
        isActive: true,
        'syncSettings.enabled': true
      });

      const results = [];
      
      for (const account of accounts) {
        try {
          const result = await this.syncAccount(userId, account._id);
          results.push({ accountId: account._id, ...result });
        } catch (error) {
          results.push({ 
            accountId: account._id, 
            status: 'error', 
            error: error.message 
          });
        }
      }

      return results;
    } catch (error) {
      logError(error, { userId, service: 'GmailSyncService.syncAllUserAccounts' });
      throw error;
    }
  }
}

export const gmailSyncService = new GmailSyncService();
