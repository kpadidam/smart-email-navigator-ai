import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Email from '../models/Email.js';
import gmailService from '../services/gmailService.js';
import emailProcessingService from '../services/emailProcessingService.js';
import { logger } from '../utils/logger.js';
import { getIO } from '../app.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Sync emails from Gmail
router.post('/sync', async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.gmailConnected || !user.gmailTokens) {
      return res.status(400).json({ error: 'Gmail not connected. Please connect your Gmail account first.' });
    }

    // Fetch emails from Gmail
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
          const email = new Email({
            userId: user._id,
            gmailId: emailData.id,
            threadId: emailData.threadId,
            subject: emailData.subject,
            from: {
              name: emailData.from?.split('<')[0]?.trim() || '',
              email: emailData.from?.match(/<(.+)>/)?.[1] || emailData.from || ''
            },
            to: emailData.to,
            cc: emailData.cc,
            bcc: emailData.bcc,
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

    res.json({ 
      message: 'Gmail sync completed',
      emailsSynced: savedEmails.length,
      totalFetched: emails.length,
      nextPageToken
    });

  } catch (error) {
    logger.error('Gmail sync error:', { userId: req.user._id, error: error.message });
    res.status(500).json({ error: 'Failed to sync emails from Gmail' });
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

    res.json({ emails, total });
  } catch (error) {
    logger.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get single email by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const email = await Email.findOne({ _id: id, userId });
    
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

    res.json(email);
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

    const email = await Email.findOneAndUpdate(
      { _id: id, userId },
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

export default router;
