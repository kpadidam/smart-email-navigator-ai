import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Email from '../models/Email.js';
import { logger } from '../utils/logger.js';
import { getIO } from '../app.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get emails with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 20, offset = 0 } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { userId };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { 'sender.name': { $regex: search, $options: 'i' } },
        { 'sender.email': { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
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
      Email.countDocuments({ userId, category: { $exists: true, $ne: null } }),
      Email.countDocuments({ userId, isDone: false, isArchived: false })
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
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    res.json(categoryCounts);
  } catch (error) {
    logger.error('Error fetching category counts:', error);
    res.status(500).json({ error: 'Failed to fetch category counts' });
  }
});

export default router;
