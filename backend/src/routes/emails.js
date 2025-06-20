import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Email from '../models/Email.js';
import { gmailService } from '../services/gmailService.js';
import emailProcessingService from '../services/emailProcessingService.js';
import { logger } from '../utils/logger.js';
import { getIO } from '../sockets/socketManager.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Helper function to transform email document to frontend format
const transformEmailForFrontend = (email) => {
  const emailObj = email.toObject ? email.toObject() : email;
  
  return {
    id: emailObj._id.toString(), // Convert ObjectId to string for frontend
    sender: emailObj.from?.name || emailObj.from?.email || 'Unknown Sender',
    senderEmail: emailObj.from?.email || '',
    subject: emailObj.subject || '(No Subject)',
    summary: emailObj.aiAnalysis?.summary || emailObj.snippet || 'No summary available',
    fullContent: emailObj.body?.html || emailObj.body?.text || '',
    category: emailObj.aiAnalysis?.category || 'other',
    datetime: emailObj.receivedAt ? emailObj.receivedAt.toISOString() : null,
    timestamp: emailObj.receivedAt ? new Date(emailObj.receivedAt).toLocaleDateString() : '',
    priority: emailObj.aiAnalysis?.priority || 'medium',
    attachments: emailObj.attachments?.map(att => ({
      name: att.filename || 'Unknown',
      size: att.size ? `${Math.round(att.size / 1024)}KB` : 'Unknown'
    })) || [],
    tags: emailObj.labelIds || [],
    status: emailObj.isRead ? 'read' : 'unread'
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
    
    // Check Gmail connection
    if (!user.gmailConnected || !user.gmailTokens) {
      return res.status(400).json({ 
        error: 'Gmail not connected. Please connect your Gmail account first.',
        action: 'reconnect'
      });
    }

    // Attempt to sync emails
    const { emails, nextPageToken } = await gmailService.listEmails(user, {
      maxResults: 50,
      q: 'in:inbox'
    });

    // Save emails to database
    const savedEmails = [];
    for (const emailData of emails) {
      try {
        // Check if email already exists
        const existingEmail = await Email.findOne({ 
          gmailId: emailData.id,
          userId: user._id 
        });

        if (!existingEmail) {
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

          const email = new Email({
            userId: user._id,
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
            labelIds: emailData.labelIds
          });

          await email.save();
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
        logger.info('AI processing completed', { userId: user._id, emailsProcessed: savedEmails.length });
      } catch (processingError) {
        logger.error('AI processing error:', { userId: user._id, error: processingError.message });
      }
    }

    // Emit real-time update
    const io = getIO();
    io.to(user._id.toString()).emit('emails:synced', { 
      count: savedEmails.length,
      emails: savedEmails 
    });

    logger.info('Gmail sync completed', { 
      userId: user._id, 
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
      status: savedEmails.length === 0 && emails.length > 0 ? 'up_to_date' : 'synced'
    });

  } catch (error) {
    logger.error('Email sync failed:', { 
      userId: req.user._id, 
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
    const userId = req.user._id;

    const [totalEmails, unreadEmails, categorizedEmails, pendingActions] = await Promise.all([
      Email.countDocuments({ userId }),
      Email.countDocuments({ userId, isRead: false }),
      Email.countDocuments({ userId, 'aiAnalysis.category': { $exists: true, $ne: null } }),
      Email.countDocuments({ userId, isRead: false, isStarred: false })
    ]);

    const stats = {
      totalEmails,
      unreadEmails,
      categorizedEmails,
      pendingActions
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'Failed to fetch email statistics' });
  }
});

// Get category counts
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user._id;

    const categoryCounts = await Email.aggregate([
      { $match: { userId } },
      { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

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

// Get emails with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 20, offset = 0 } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { userId };
    
    if (category && category !== 'all') {
      query['aiAnalysis.category'] = category;
    }
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { 'from.name': { $regex: search, $options: 'i' } },
        { 'from.email': { $regex: search, $options: 'i' } },
        { 'body.text': { $regex: search, $options: 'i' } }
      ];
    }

    // Get emails with pagination
    const emails = await Email.find(query)
      .sort({ receivedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Email.countDocuments(query);

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
    const userId = req.user._id;

    // Validate ObjectId format
    const cleanId = id.trim(); // Remove any whitespace/newlines
    if (!cleanId || !cleanId.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn('Invalid email ID format', { id: id, cleanId: cleanId, userId: userId });
      return res.status(400).json({ error: 'Invalid email ID format' });
    }

    const email = await Email.findOne({ _id: cleanId, userId });
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read if not already
    if (!email.isRead) {
      email.isRead = true;
      await email.save();

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
      io.to(userId.toString()).emit('email:read', { emailId: email._id });
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
    const userId = req.user._id;
    const updates = req.body;

    // Validate ObjectId format
    const cleanId = id.trim(); // Remove any whitespace/newlines
    if (!cleanId || !cleanId.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn('Invalid email ID format for update', { id: id, cleanId: cleanId, userId: userId });
      return res.status(400).json({ error: 'Invalid email ID format' });
    }

    const email = await Email.findOneAndUpdate(
      { _id: cleanId, userId },
      updates,
      { new: true }
    );

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
