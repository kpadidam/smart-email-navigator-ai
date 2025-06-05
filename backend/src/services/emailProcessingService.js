import { gmailSyncService } from './gmailSyncService.js';
import { emailCategorizationService } from './emailCategorizationService.js';
import { realtimeEmailService } from './realtimeEmailService.js';
import EmailAccount from '../models/EmailAccount.js';
import Email from '../models/Email.js';
import { logger, logInfo, logError } from '../utils/logger.js';

class EmailProcessingService {
  constructor() {
    this.processingQueue = new Map(); // Track processing jobs
  }

  // Main orchestration method for email processing
  async processUserEmails(userId, options = {}) {
    try {
      const {
        accountId = null,
        forceSync = false,
        categorizeOnly = false
      } = options;

      logInfo('Starting email processing', { userId, options });

      // Get user's email accounts
      const accounts = accountId 
        ? [await EmailAccount.findOne({ _id: accountId, userId, isActive: true })]
        : await EmailAccount.find({ userId, isActive: true, 'syncSettings.enabled': true });

      if (!accounts.length || (accountId && !accounts[0])) {
        throw new Error('No active email accounts found');
      }

      const results = [];

      for (const account of accounts) {
        try {
          let result;
          
          if (categorizeOnly) {
            // Only re-categorize existing emails
            result = await this.recategorizeAccountEmails(userId, account._id);
          } else {
            // Full sync and processing
            result = await this.processAccountEmails(userId, account._id, forceSync);
          }
          
          results.push({
            accountId: account._id,
            emailAddress: account.emailAddress,
            ...result
          });
        } catch (error) {
          logError(error, { 
            userId, 
            accountId: account._id,
            service: 'EmailProcessingService.processUserEmails' 
          });
          
          results.push({
            accountId: account._id,
            emailAddress: account.emailAddress,
            status: 'error',
            error: error.message
          });
        }
      }

      // Update overall dashboard statistics
      await this.updateUserDashboard(userId);

      logInfo('Email processing completed', { userId, results });
      return results;

    } catch (error) {
      logError(error, { userId, service: 'EmailProcessingService.processUserEmails' });
      throw error;
    }
  }

  // Process emails for a specific account
  async processAccountEmails(userId, accountId, forceSync = false) {
    try {
      const account = await EmailAccount.findById(accountId);
      
      if (!account) {
        throw new Error('Email account not found');
      }

      // Check if sync is needed
      if (!forceSync && !account.isSyncDue()) {
        logInfo('Account sync not due, skipping', { userId, accountId });
        return { status: 'skipped', reason: 'sync_not_due' };
      }

      // Sync emails from Gmail
      const syncResult = await gmailSyncService.syncAccount(userId, accountId);
      
      if (syncResult.status === 'error') {
        throw new Error(syncResult.error || 'Email sync failed');
      }

      // If no new emails, return early
      if (syncResult.count === 0) {
        return { 
          status: 'completed', 
          newEmails: 0,
          message: 'No new emails to process'
        };
      }

      // Get recently synced emails for categorization
      const recentEmails = await Email.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
      }).limit(syncResult.count);

      // Categorize and prioritize emails
      await this.categorizeEmails(userId, recentEmails);

      return {
        status: 'completed',
        newEmails: syncResult.count,
        totalEmails: syncResult.totalEmails,
        unreadEmails: syncResult.unreadEmails
      };

    } catch (error) {
      logError(error, { 
        userId, 
        accountId, 
        service: 'EmailProcessingService.processAccountEmails' 
      });
      throw error;
    }
  }

  // Categorize and prioritize emails
  async categorizeEmails(userId, emails) {
    try {
      if (!emails.length) return;

      logInfo('Starting email categorization', { userId, count: emails.length });

      const batchSize = 10;
      let processedCount = 0;

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        // Categorize batch
        const categorizations = await emailCategorizationService.categorizeEmailBatch(batch);
        
        // Update emails with categorization results
        for (const result of categorizations) {
          try {
            const email = await Email.findById(result.emailId);
            if (email) {
              const oldCategory = email.category;
              const oldPriority = email.priority;
              
              email.category = result.category;
              email.priority = result.priority;
              
              // Store categorization metadata
              email.metadata = {
                ...email.metadata,
                categoryConfidence: result.categoryConfidence,
                priorityConfidence: result.priorityConfidence,
                categorizationReasons: result.reasons,
                lastCategorizedAt: new Date()
              };
              
              await email.save();
              
              // Emit real-time updates if category or priority changed
              if (oldCategory !== result.category) {
                await realtimeEmailService.updateEmailCategory(
                  userId, 
                  email._id, 
                  oldCategory, 
                  result.category, 
                  result.categoryConfidence
                );
              }
              
              if (oldPriority !== result.priority) {
                await realtimeEmailService.updateEmailPriority(
                  userId, 
                  email._id, 
                  result.priority, 
                  result.reasons.priority.join(', ')
                );
              }
              
              processedCount++;
            }
          } catch (emailError) {
            logError(emailError, { 
              userId, 
              emailId: result.emailId,
              service: 'EmailProcessingService.categorizeEmails.updateEmail' 
            });
          }
        }
      }

      logInfo('Email categorization completed', { 
        userId, 
        processedCount,
        totalEmails: emails.length 
      });

      return { processedCount, totalEmails: emails.length };

    } catch (error) {
      logError(error, { 
        userId, 
        emailCount: emails.length,
        service: 'EmailProcessingService.categorizeEmails' 
      });
      throw error;
    }
  }

  // Re-categorize existing emails for an account
  async recategorizeAccountEmails(userId, accountId) {
    try {
      logInfo('Starting email re-categorization', { userId, accountId });

      // Get all emails for the account
      const emails = await Email.find({ userId }).limit(1000); // Limit for performance
      
      if (!emails.length) {
        return { status: 'completed', message: 'No emails to categorize' };
      }

      // Categorize emails
      const result = await this.categorizeEmails(userId, emails);
      
      return {
        status: 'completed',
        recategorizedEmails: result.processedCount,
        totalEmails: result.totalEmails
      };

    } catch (error) {
      logError(error, { 
        userId, 
        accountId,
        service: 'EmailProcessingService.recategorizeAccountEmails' 
      });
      throw error;
    }
  }

  // Update user's dashboard statistics
  async updateUserDashboard(userId) {
    try {
      // Calculate statistics
      const totalEmails = await Email.countDocuments({ userId });
      const unreadEmails = await Email.countDocuments({ userId, isRead: false });
      const starredEmails = await Email.countDocuments({ userId, isStarred: true });
      const importantEmails = await Email.countDocuments({ userId, isImportant: true });

      // Category breakdown
      const categoryStats = await Email.aggregate([
        { $match: { userId } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);

      const categories = {};
      categoryStats.forEach(stat => {
        categories[stat._id] = stat.count;
      });

      // Priority breakdown
      const priorityStats = await Email.aggregate([
        { $match: { userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);

      const priorities = {};
      priorityStats.forEach(stat => {
        priorities[stat._id] = stat.count;
      });

      // Recent activity (last 24 hours)
      const recentEmails = await Email.countDocuments({
        userId,
        receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      const dashboardStats = {
        totalEmails,
        unreadEmails,
        starredEmails,
        importantEmails,
        categories,
        priorities,
        recentEmails,
        lastUpdated: new Date()
      };

      // Emit dashboard update
      await realtimeEmailService.updateDashboard(userId, dashboardStats);

      logInfo('Dashboard statistics updated', { userId, dashboardStats });
      return dashboardStats;

    } catch (error) {
      logError(error, { 
        userId,
        service: 'EmailProcessingService.updateUserDashboard' 
      });
      throw error;
    }
  }

  // Schedule email processing for a user
  async scheduleEmailProcessing(userId, options = {}) {
    try {
      const jobId = `${userId}-${Date.now()}`;
      
      // Add to processing queue
      this.processingQueue.set(jobId, {
        userId,
        options,
        status: 'queued',
        createdAt: new Date()
      });

      // Process asynchronously
      setImmediate(async () => {
        try {
          this.processingQueue.set(jobId, {
            ...this.processingQueue.get(jobId),
            status: 'processing',
            startedAt: new Date()
          });

          const result = await this.processUserEmails(userId, options);
          
          this.processingQueue.set(jobId, {
            ...this.processingQueue.get(jobId),
            status: 'completed',
            completedAt: new Date(),
            result
          });

          // Clean up old jobs after 1 hour
          setTimeout(() => {
            this.processingQueue.delete(jobId);
          }, 60 * 60 * 1000);

        } catch (error) {
          this.processingQueue.set(jobId, {
            ...this.processingQueue.get(jobId),
            status: 'error',
            error: error.message,
            completedAt: new Date()
          });

          logError(error, { 
            userId, 
            jobId,
            service: 'EmailProcessingService.scheduleEmailProcessing' 
          });
        }
      });

      return { jobId, status: 'queued' };

    } catch (error) {
      logError(error, { 
        userId,
        service: 'EmailProcessingService.scheduleEmailProcessing' 
      });
      throw error;
    }
  }

  // Get processing job status
  getJobStatus(jobId) {
    return this.processingQueue.get(jobId) || { status: 'not_found' };
  }

  // Get processing statistics
  getProcessingStats() {
    const jobs = Array.from(this.processingQueue.values());
    
    return {
      totalJobs: jobs.length,
      queued: jobs.filter(job => job.status === 'queued').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      errors: jobs.filter(job => job.status === 'error').length
    };
  }
}

export const emailProcessingService = new EmailProcessingService();
