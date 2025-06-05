import { getIO } from '../app.js';
import { 
  emitEmailProcessed, 
  emitEmailBatchProcessed, 
  emitDashboardUpdate,
  emitSyncStatusUpdate,
  emitEmailCategorized,
  emitErrorToUser
} from '../sockets/emailSocket.js';
import { logger, logInfo, logError } from '../utils/logger.js';

class RealtimeEmailService {
  constructor() {
    this.io = null;
  }

  // Initialize with socket.io instance
  initialize(io) {
    this.io = io;
    logInfo('Realtime email service initialized');
  }

  // Process and emit single email
  async processEmail(userId, emailData) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      // Emit email processed event
      emitEmailProcessed(this.io, userId, {
        id: emailData._id,
        subject: emailData.subject,
        from: emailData.from,
        category: emailData.category,
        priority: emailData.priority,
        isRead: emailData.isRead,
        receivedAt: emailData.receivedAt,
        snippet: emailData.snippet,
        accountId: emailData.accountId,
        summary: emailData.summary || emailData.snippet
      });

      logInfo('Email processed and emitted', { 
        userId, 
        emailId: emailData._id,
        subject: emailData.subject 
      });
    } catch (error) {
      logError(error, { 
        userId, 
        emailId: emailData._id,
        service: 'RealtimeEmailService.processEmail' 
      });
      
      if (this.io) {
        emitErrorToUser(this.io, userId, error, { 
          action: 'process_email',
          emailId: emailData._id 
        });
      }
    }
  }

  // Process and emit email batch
  async processBatch(userId, emails, accountId) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      // Process each email individually
      for (const email of emails) {
        await this.processEmail(userId, { ...email, accountId });
      }

      // Emit batch completion
      emitEmailBatchProcessed(this.io, userId, {
        count: emails.length,
        accountId,
        categories: this.getCategoryCounts(emails),
        priorities: this.getPriorityCounts(emails),
        unreadCount: emails.filter(email => !email.isRead).length
      });

      logInfo('Email batch processed and emitted', { 
        userId, 
        count: emails.length,
        accountId 
      });
    } catch (error) {
      logError(error, { 
        userId, 
        accountId,
        batchSize: emails.length,
        service: 'RealtimeEmailService.processBatch' 
      });
      
      if (this.io) {
        emitErrorToUser(this.io, userId, error, { 
          action: 'process_batch',
          accountId,
          batchSize: emails.length 
        });
      }
    }
  }

  // Update dashboard statistics
  async updateDashboard(userId, stats) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      emitDashboardUpdate(this.io, userId, stats);

      logInfo('Dashboard updated and emitted', { 
        userId, 
        totalEmails: stats.totalEmails,
        unreadEmails: stats.unreadEmails 
      });
    } catch (error) {
      logError(error, { 
        userId,
        service: 'RealtimeEmailService.updateDashboard' 
      });
    }
  }

  // Update sync status
  async updateSyncStatus(userId, accountId, status) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      emitSyncStatusUpdate(this.io, userId, accountId, status);

      logInfo('Sync status updated and emitted', { 
        userId, 
        accountId,
        status: status.status 
      });
    } catch (error) {
      logError(error, { 
        userId,
        accountId,
        service: 'RealtimeEmailService.updateSyncStatus' 
      });
    }
  }

  // Emit email categorization update
  async updateEmailCategory(userId, emailId, oldCategory, newCategory, confidence) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      emitEmailCategorized(this.io, userId, {
        id: emailId,
        oldCategory,
        newCategory,
        confidence
      });

      logInfo('Email category updated and emitted', { 
        userId, 
        emailId,
        oldCategory,
        newCategory 
      });
    } catch (error) {
      logError(error, { 
        userId,
        emailId,
        service: 'RealtimeEmailService.updateEmailCategory' 
      });
    }
  }

  // Emit priority update
  async updateEmailPriority(userId, emailId, priority, reason) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      const payload = {
        emailId,
        priority,
        reason,
        timestamp: new Date(),
        type: 'priority_updated'
      };
      
      this.io.to(userId).emit('email:priority_updated', payload);

      logInfo('Email priority updated and emitted', { 
        userId, 
        emailId,
        priority 
      });
    } catch (error) {
      logError(error, { 
        userId,
        emailId,
        service: 'RealtimeEmailService.updateEmailPriority' 
      });
    }
  }

  // Emit email status change (read/unread/starred)
  async updateEmailStatus(userId, emailId, status, value) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      const payload = {
        emailId,
        status,
        value,
        timestamp: new Date(),
        type: 'status_updated'
      };
      
      this.io.to(userId).emit('email:status_updated', payload);

      logInfo('Email status updated and emitted', { 
        userId, 
        emailId,
        status,
        value 
      });
    } catch (error) {
      logError(error, { 
        userId,
        emailId,
        service: 'RealtimeEmailService.updateEmailStatus' 
      });
    }
  }

  // Emit new email notification
  async notifyNewEmail(userId, emailData) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      const payload = {
        id: emailData._id,
        subject: emailData.subject,
        from: emailData.from,
        category: emailData.category,
        priority: emailData.priority,
        receivedAt: emailData.receivedAt,
        snippet: emailData.snippet,
        timestamp: new Date(),
        type: 'new_email'
      };
      
      this.io.to(userId).emit('email:new', payload);

      logInfo('New email notification emitted', { 
        userId, 
        emailId: emailData._id,
        subject: emailData.subject 
      });
    } catch (error) {
      logError(error, { 
        userId,
        emailId: emailData._id,
        service: 'RealtimeEmailService.notifyNewEmail' 
      });
    }
  }

  // Helper method to get category counts
  getCategoryCounts(emails) {
    return emails.reduce((counts, email) => {
      counts[email.category] = (counts[email.category] || 0) + 1;
      return counts;
    }, {});
  }

  // Helper method to get priority counts
  getPriorityCounts(emails) {
    return emails.reduce((counts, email) => {
      counts[email.priority] = (counts[email.priority] || 0) + 1;
      return counts;
    }, {});
  }

  // Check if service is initialized
  isInitialized() {
    return this.io !== null;
  }

  // Get connected users count
  getConnectedUsersCount() {
    if (!this.io) return 0;
    return this.io.engine.clientsCount;
  }

  // Emit to specific room
  async emitToRoom(room, event, data) {
    try {
      if (!this.io) {
        throw new Error('Socket.io not initialized');
      }

      this.io.to(room).emit(event, {
        ...data,
        timestamp: new Date()
      });

      logInfo('Event emitted to room', { room, event });
    } catch (error) {
      logError(error, { 
        room,
        event,
        service: 'RealtimeEmailService.emitToRoom' 
      });
    }
  }
}

// Export singleton instance
export const realtimeEmailService = new RealtimeEmailService();
