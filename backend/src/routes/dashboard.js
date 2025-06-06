import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Email from '../models/Email.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get dashboard overview
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get recent emails
    const recentEmails = await Email.find({ userId })
      .sort({ receivedAt: -1 })
      .limit(5)
      .select('subject sender receivedAt category priority');

    // Get email stats
    const [totalEmails, unreadEmails, categorizedEmails, pendingActions] = await Promise.all([
      Email.countDocuments({ userId }),
      Email.countDocuments({ userId, isRead: false }),
      Email.countDocuments({ userId, category: { $exists: true, $ne: null } }),
      Email.countDocuments({ userId, isDone: false, isArchived: false })
    ]);

    // Get category distribution
    const categoryDistribution = await Email.aggregate([
      { $match: { userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // Get emails by day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const emailsByDay = await Email.aggregate([
      { 
        $match: { 
          userId, 
          receivedAt: { $gte: sevenDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$receivedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      stats: {
        totalEmails,
        unreadEmails,
        categorizedEmails,
        pendingActions
      },
      recentEmails,
      categoryDistribution,
      emailsByDay
    });

  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
