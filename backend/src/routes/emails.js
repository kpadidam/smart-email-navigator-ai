import express from 'express';
import { authenticate } from '../middleware/auth.js';
import emailDbService from '../services/emailDbService.js';
import emailAccountService from '../services/emailAccountService.js';
import gmailService from '../services/gmailService.js';
import emailProcessingService from '../services/emailProcessingService.js';
import { logger } from '../utils/logger.js';
import { getIO } from '../app.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Helper function to transform email document to frontend format
const transformEmailForFrontend = (email) => {
  return {
    id: email.id,
    sender: email.fromName || email.fromEmail || 'Unknown Sender',
    senderEmail: email.fromEmail || '',
    subject: email.subject || '(No Subject)',
    summary: email.aiSummary || email.snippet || 'No summary available',
    fullContent: email.bodyHtml || email.bodyText || '',
    category: email.aiCategory?.toLowerCase() || 'other',
    datetime: email.receivedAt ? email.receivedAt.toISOString() : null,
    timestamp: email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : '',
    priority: email.aiPriority?.toLowerCase() || 'medium',
    attachments: email.attachments || [],
    tags: email.labelIds || [],
    status: email.isRead ? 'read' : 'unread'
  };
};

// Sync emails from Gmail (GET route to check sync status)
router.get('/sync', async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.gmailConnected || !user.gmailTokens) {
      return res.status(400).json({ error: 'Gmail not connected. Please connect your Gmail account first.' });
    }

    // Return sync status/info instead of performing sync
    res.json({ 
      message: 'Use POST method to sync emails',
      method: 'POST',
      connected: user.gmailConnected,
      hasTokens: !!(user.gmailTokens && user.gmailTokens.access_token)
    });
  } catch (error) {
    logger.error('Sync status check error:', error);
    res.status(500).json({ error: 'Failed to check sync status' });
  }
});

// Sync emails from Gmail (POST route to perform sync)
router.post('/sync', async (req, res) => {
  try {
    const user = req.user;
    const { accountId } = req.body; // Optional: specific account to sync

    // Determine which account to sync
    let accountToSync, accountType, syncAccountId;
    
    if (accountId && accountId !== 'primary') {
      // Sync specific additional account
      const emailAccount = await emailAccountService.findByIdAndUser(accountId, user.id);
      
      if (!emailAccount) {
        return res.status(404).json({ error: 'Email account not found' });
      }
      
      accountToSync = emailAccount;
      accountType = 'email_account';
      syncAccountId = emailAccount.id;
      
      logger.info('Syncing additional email account', { 
        userId: user.id, 
        accountId, 
        email: emailAccount.email 
      });
    } else {
      // Sync primary account (default)
      if (!user.gmailConnected || !user.gmailTokens) {
        return res.status(400).json({ 
          error: 'Gmail not connected. Please connect your Gmail account first.',
          action: 'reconnect'
        });
      }
      
      accountToSync = user;
      accountType = 'user';
      syncAccountId = 'primary';
      
      logger.info('Syncing primary email account', { 
        userId: user.id, 
        email: user.email 
      });
    }

    // Attempt to sync emails using the updated Gmail service
    const { emails, nextPageToken } = await gmailService.listEmails(accountToSync, accountType, {
      maxResults: 50,
      q: 'in:inbox'
    });

    // Save emails to database with account information
    const savedEmails = [];
    for (const emailData of emails) {
      try {
        // Check if email already exists for this user and account
        const exists = await emailDbService.existsByGmailId(
          emailData.id,
          user.id,
          syncAccountId
        );

        if (!exists) {
          // Helper function to parse email addresses
          const parseEmailAddresses = (addressString) => {
            if (!addressString) return [];
            
            // Split by comma and parse each address
            return addressString.split(',').map(addr => {
              const trimmed = addr.trim();
              const match = trimmed.match(/^(.+?)\s*<(.+?)>$/) || [null, '', trimmed];
              return {
                name: match[1]?.trim().replace(/"/g, '') || '',
                email: (match[2] || trimmed).trim()
              };
            }).filter(addr => addr.email); // Only include entries with valid emails
          };

          const email = await emailDbService.create({
            userId: user.id,
            accountId: syncAccountId, // Track the source account
            emailAccountId: accountType === 'email_account' ? syncAccountId : null,
            gmailId: emailData.id,
            threadId: emailData.threadId,
            subject: emailData.subject,
            from: {
              name: emailData.from?.split('<')[0]?.trim() || '',
              email: emailData.from?.match(/<(.+)>/)?.[1] || emailData.from || ''
            },
            to: parseEmailAddresses(emailData.to),
            cc: parseEmailAddresses(emailData.cc),
            bcc: parseEmailAddresses(emailData.bcc),
            body: {
              text: emailData.textBody || '',
              html: emailData.htmlBody || ''
            },
            snippet: emailData.snippet,
            isRead: emailData.isRead,
            isStarred: emailData.isStarred,
            isImportant: emailData.isImportant,
            receivedAt: emailData.internalDate,
            labelIds: emailData.labelIds || [],
            labels: emailData.labelIds || []
          });

          savedEmails.push(email);
        }
      } catch (emailError) {
        logger.error('Error saving individual email:', { emailId: emailData.id, error: emailError.message });
      }
    }

    // Process emails with AI categorization
    if (savedEmails.length > 0) {
      try {
        await emailProcessingService.processEmails(savedEmails);
        logger.info('AI processing completed', { userId: user.id, emailsProcessed: savedEmails.length });
      } catch (processingError) {
        logger.error('AI processing error:', { userId: user.id, error: processingError.message });
      }
    }

    // Update sync timestamp for the account
    if (accountType === 'email_account') {
      await emailAccountService.updateLastSync(accountId);
    }

    // Emit real-time update
    const io = getIO();
    io.to(user.id.toString()).emit('emails:synced', { 
      count: savedEmails.length,
      emails: savedEmails,
      accountId: syncAccountId
    });

    logger.info('Gmail sync completed', { 
      userId: user.id, 
      accountId: syncAccountId,
      emailsSynced: savedEmails.length,
      totalFetched: emails.length 
    });

    // Provide more informative message based on sync results
    let message = 'Gmail sync completed';
    if (savedEmails.length === 0 && emails.length > 0) {
      message = 'Gmail sync completed - all emails are already up to date';
    } else if (savedEmails.length > 0) {
      message = `Gmail sync completed - ${savedEmails.length} new emails added`;
    }

    res.json({ 
      message,
      emailsSynced: savedEmails.length,
      totalFetched: emails.length,
      nextPageToken,
      accountId: syncAccountId,
      status: savedEmails.length === 0 && emails.length > 0 ? 'up_to_date' : 'synced'
    });

  } catch (error) {
    logger.error('Email sync failed:', { 
      userId: req.user.id, 
      error: error.message 
    });

    // Handle specific token refresh errors
    if (error.message.includes('refresh token') || error.message.includes('invalid_grant')) {
      return res.status(401).json({
        error: 'Gmail authentication expired. Please reconnect your Gmail account.',
        action: 'reconnect'
      });
    }
    res.status(500).json({ error: 'Failed to sync emails from Gmail', details: error.message });
  }
});

// Get email statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId } = req.query;

    const stats = await emailDbService.getStats(userId, accountId);
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'Failed to fetch email statistics' });
  }
});

// Get category counts
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryCounts = await emailDbService.getCategoryCounts(userId);
    res.json(categoryCounts);
  } catch (error) {
    logger.error('Error fetching category counts:', error);
    res.status(500).json({ error: 'Failed to fetch category counts' });
  }
});

// Check Gmail connection status
router.get('/gmail/status', async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      connected: user.gmailConnected || false,
      connectedAt: user.gmailConnectedAt,
      hasTokens: !!(user.gmailTokens && user.gmailTokens.access_token)
    });
  } catch (error) {
    logger.error('Error checking Gmail status:', error);
    res.status(500).json({ error: 'Failed to check Gmail status' });
  }
});

// Get all email accounts for the authenticated user (MUST BE BEFORE /:id route)
router.get('/accounts', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all email accounts for this user
    const emailAccounts = await emailAccountService.findByUser(userId);
    
    // Include the primary account from User model as well
    const primaryAccount = {
      id: 'primary',
      email: req.user.email,
      provider: 'gmail',
      isPrimary: true,
      lastSyncAt: req.user.gmailConnectedAt,
      createdAt: req.user.createdAt
    };
    
    // Combine primary and additional accounts
    const allAccounts = [
      primaryAccount,
      ...emailAccounts.map(account => ({
        id: account.id.toString(),
        email: account.email,
        provider: account.provider.toLowerCase(),
        isPrimary: false,
        lastSyncAt: account.lastSyncAt,
        createdAt: account.createdAt
      }))
    ];
    
    res.json({ accounts: allAccounts });
  } catch (error) {
    logger.error('Error fetching email accounts:', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Failed to fetch email accounts' });
  }
});

// Set active email account for session (MUST BE BEFORE /:id route)
router.post('/accounts/switch', async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    let accountInfo;
    
    if (accountId === 'primary') {
      // Switch to primary account (from User model)
      accountInfo = {
        id: 'primary',
        email: req.user.email,
        provider: 'gmail',
        isPrimary: true
      };
    } else {
      // Switch to additional account (from EmailAccount model)
      const emailAccount = await emailAccountService.findByIdAndUser(accountId, userId);
      
      if (!emailAccount) {
        return res.status(404).json({ error: 'Email account not found' });
      }
      
      accountInfo = {
        id: emailAccount.id.toString(),
        email: emailAccount.email,
        provider: emailAccount.provider.toLowerCase(),
        isPrimary: false
      };
    }
    
    logger.info('Account switched successfully', { 
      userId, 
      newAccount: accountInfo.email 
    });
    
    res.json({ 
      message: 'Account switched successfully',
      activeAccount: accountInfo
    });
  } catch (error) {
    logger.error('Error switching email account:', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Failed to switch email account' });
  }
});

// Get emails with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 20, offset = 0, accountId } = req.query;
    const userId = req.user.id;

    const { emails, total } = await emailDbService.findByUser(userId, {
      category,
      search,
      limit,
      offset,
      accountId
    });

    // Transform emails for frontend
    const transformedEmails = emails.map(transformEmailForFrontend);

    res.json({ emails: transformedEmails, total });
  } catch (error) {
    logger.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get single email by ID (MUST BE LAST - after all specific routes)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const email = await emailDbService.findByIdAndUser(id, userId);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read if not already
    if (!email.isRead) {
      await emailDbService.markAsRead(id, userId);

      // Also mark as read in Gmail
      try {
        if (req.user.gmailConnected && email.gmailId) {
          await gmailService.markAsRead(req.user, email.gmailId);
        }
      } catch (gmailError) {
        logger.error('Failed to mark email as read in Gmail:', gmailError);
      }

      // Emit real-time update
      const io = getIO();
      io.to(userId.toString()).emit('email:read', { emailId: email.id });
    }

    // Transform email for frontend
    const transformedEmail = transformEmailForFrontend(email);
    res.json(transformedEmail);
  } catch (error) {
    logger.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Update email
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const email = await emailDbService.update(id, userId, updates);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Emit real-time update
    const io = getIO();
    io.to(userId.toString()).emit('email:updated', email);

    res.json(email);
  } catch (error) {
    logger.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

export default router;