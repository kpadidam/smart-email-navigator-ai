import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Email from '../models/Email.js';
import EmailAccount from '../models/EmailAccount.js';
import { logger } from '../utils/logger.js';
import { openaiService } from '../services/openaiService.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

/**
 * Get admin dashboard overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const gmailConnectedUsers = await User.countDocuments({ gmailConnected: true });
    
    // Get email statistics
    const totalEmails = await Email.countDocuments();
    const emailsToday = await Email.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Get sync status
    const lastSyncStats = await EmailAccount.aggregate([
      {
        $group: {
          _id: null,
          avgLastSync: { $avg: { $toDouble: '$lastSyncAt' } },
          totalAccounts: { $sum: 1 },
          activeAccounts: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
          }
        }
      }
    ]);

    // Get recent errors (would need error logging collection)
    const recentErrors = await User.find({ 
      'syncErrors.0': { $exists: true } 
    })
    .select('email firstName lastName syncErrors')
    .limit(10);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        gmailConnected: gmailConnectedUsers,
        connectionRate: totalUsers > 0 ? (gmailConnectedUsers / totalUsers * 100).toFixed(1) : 0
      },
      emails: {
        total: totalEmails,
        today: emailsToday
      },
      sync: {
        totalAccounts: lastSyncStats[0]?.totalAccounts || 0,
        activeAccounts: lastSyncStats[0]?.activeAccounts || 0,
        avgLastSync: lastSyncStats[0]?.avgLastSync ? new Date(lastSyncStats[0].avgLastSync) : null
      },
      recentErrors: recentErrors,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
  }
});

/**
 * Get all users with sync status
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build search query
    const searchQuery = search ? {
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(searchQuery)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate({
        path: 'emailAccounts',
        select: 'email provider lastSyncAt isActive syncSettings'
      });

    const total = await User.countDocuments(searchQuery);

    // Add email statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const emailStats = await Email.aggregate([
          { $match: { userId: user._id } },
          {
            $group: {
              _id: null,
              totalEmails: { $sum: 1 },
              unreadEmails: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
              lastEmailDate: { $max: '$receivedAt' }
            }
          }
        ]);

        return {
          ...user.toObject(),
          emailStats: emailStats[0] || { totalEmails: 0, unreadEmails: 0, lastEmailDate: null }
        };
      })
    );

    res.json({
      users: usersWithStats,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalItems: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get specific user details
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate({
        path: 'emailAccounts',
        select: 'email provider lastSyncAt isActive syncSettings tokenExpiry'
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get email statistics
    const emailStats = await Email.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$aiAnalysis.category',
          count: { $sum: 1 },
          unreadCount: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } }
        }
      }
    ]);

    // Get recent emails
    const recentEmails = await Email.find({ userId: user._id })
      .sort({ receivedAt: -1 })
      .limit(10)
      .select('subject from receivedAt isRead aiAnalysis.category aiAnalysis.priority');

    res.json({
      user: user.toObject(),
      emailStats,
      recentEmails
    });

  } catch (error) {
    logger.error('Admin user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * Update user status
 */
router.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, role } = req.body;

    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (['user', 'admin'].includes(role)) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User updated by admin', { 
      adminId: req.user._id, 
      userId, 
      updates: updateData 
    });

    res.json(user);

  } catch (error) {
    logger.error('Admin user update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Get sync status overview
 */
router.get('/sync-status', async (req, res) => {
  try {
    // Get all email accounts with their sync status
    const accounts = await EmailAccount.find({ isActive: true })
      .populate('userId', 'email firstName lastName')
      .select('email provider lastSyncAt isActive syncSettings tokenExpiry')
      .sort({ lastSyncAt: -1 });

    // Categorize accounts by sync status
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const syncStats = {
      healthy: [],      // Synced within 1 hour
      warning: [],      // Synced within 1 day
      error: [],        // Not synced in over 1 day
      noData: []        // Never synced
    };

    accounts.forEach(account => {
      if (!account.lastSyncAt) {
        syncStats.noData.push(account);
      } else if (account.lastSyncAt > oneHourAgo) {
        syncStats.healthy.push(account);
      } else if (account.lastSyncAt > oneDayAgo) {
        syncStats.warning.push(account);
      } else {
        syncStats.error.push(account);
      }
    });

    res.json({
      summary: {
        total: accounts.length,
        healthy: syncStats.healthy.length,
        warning: syncStats.warning.length,
        error: syncStats.error.length,
        noData: syncStats.noData.length
      },
      accounts: syncStats
    });

  } catch (error) {
    logger.error('Admin sync status error:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

/**
 * Force sync for a user
 */
router.post('/users/:userId/sync', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.gmailConnected) {
      return res.status(400).json({ error: 'User Gmail not connected' });
    }

    // Trigger sync (you would call your sync service here)
    // This is a placeholder - implement based on your sync architecture
    logger.info('Admin triggered sync', { 
      adminId: req.user._id, 
      targetUserId: userId 
    });

    res.json({ 
      message: 'Sync initiated', 
      userId,
      timestamp: new Date() 
    });

  } catch (error) {
    logger.error('Admin force sync error:', error);
    res.status(500).json({ error: 'Failed to initiate sync' });
  }
});

/**
 * Get system health
 */
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const dbHealth = await User.findOne().limit(1);
    
    // Check OpenAI service
    const openaiHealth = await openaiService.healthCheck();
    
    // Get error rates (would need proper error tracking)
    const recentErrors = await User.countDocuments({
      'syncErrors.0': { $exists: true },
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    const totalUsers = await User.countDocuments({ isActive: true });
    const errorRate = totalUsers > 0 ? (recentErrors / totalUsers * 100).toFixed(2) : 0;

    res.json({
      database: {
        status: dbHealth ? 'healthy' : 'unhealthy',
        connection: !!dbHealth
      },
      openai: openaiHealth,
      errorRate: {
        percentage: parseFloat(errorRate),
        threshold: 0.5,
        status: errorRate < 0.5 ? 'healthy' : 'warning'
      },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Admin health check error:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

export default router; 