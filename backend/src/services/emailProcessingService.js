import { logger } from '../utils/logger.js';
import Email from '../models/Email.js';

/**
 * Email Processing Service for AI categorization and analysis
 */
class EmailProcessingService {
  
  /**
   * Categorize email based on content analysis
   * @param {Object} emailData - Email data to analyze
   * @returns {Object} AI analysis results
   */
  async categorizeEmail(emailData) {
    try {
      const { subject, from, body } = emailData;
      const content = `${subject} ${body.text || body.html || ''}`.toLowerCase();
      
      // Simple rule-based categorization (can be enhanced with actual AI/ML)
      let category = 'other';
      let priority = 'medium';
      let sentiment = 'neutral';
      
      // Category detection
      if (this.isWorkEmail(content, from)) {
        category = 'work';
        priority = 'high';
      } else if (this.isPromotionalEmail(content, from)) {
        category = 'promotional';
        priority = 'low';
      } else if (this.isSocialEmail(content, from)) {
        category = 'social';
        priority = 'low';
      } else if (this.isUpdateEmail(content, from)) {
        category = 'updates';
        priority = 'medium';
      } else if (this.isPersonalEmail(content, from)) {
        category = 'personal';
        priority = 'high';
      }
      
      // Priority detection
      if (this.isUrgentEmail(content, subject)) {
        priority = 'high';
      }
      
      // Sentiment analysis (basic)
      sentiment = this.analyzeSentiment(content);
      
      // Generate summary
      const summary = this.generateSummary(subject, body.text || body.html || '');
      
      // Extract action items
      const actionItems = this.extractActionItems(content);
      
      return {
        category,
        priority,
        sentiment,
        summary,
        actionItems,
        confidence: 0.8, // Static confidence for now
        processedAt: new Date()
      };
      
    } catch (error) {
      logger.error('Error categorizing email:', error);
      return {
        category: 'other',
        priority: 'medium',
        sentiment: 'neutral',
        summary: emailData.subject || 'No subject',
        actionItems: [],
        confidence: 0.1,
        processedAt: new Date()
      };
    }
  }
  
  /**
   * Process multiple emails for AI analysis
   * @param {Array} emails - Array of email objects
   * @returns {Array} Processed emails with AI analysis
   */
  async processEmails(emails) {
    const processedEmails = [];
    
    for (const email of emails) {
      try {
        const aiAnalysis = await this.categorizeEmail(email);
        
        // Update email in database
        await Email.findByIdAndUpdate(email._id, { aiAnalysis });
        
        processedEmails.push({
          ...email.toObject(),
          aiAnalysis
        });
        
        logger.info('Email processed', { emailId: email._id, category: aiAnalysis.category });
      } catch (error) {
        logger.error('Error processing email:', { emailId: email._id, error: error.message });
        processedEmails.push(email);
      }
    }
    
    return processedEmails;
  }
  
  // Helper methods for categorization
  isWorkEmail(content, from) {
    const workKeywords = ['meeting', 'project', 'deadline', 'report', 'presentation', 'client', 'team', 'work', 'office', 'business'];
    const workDomains = ['company.com', 'corp.com', 'inc.com', 'ltd.com'];
    
    return workKeywords.some(keyword => content.includes(keyword)) ||
           workDomains.some(domain => from.email?.includes(domain));
  }
  
  isPromotionalEmail(content, from) {
    const promoKeywords = ['sale', 'discount', 'offer', 'deal', 'promotion', 'coupon', 'free', 'limited time', 'buy now', 'shop'];
    const promoSenders = ['noreply', 'marketing', 'promo', 'deals', 'offers'];
    
    return promoKeywords.some(keyword => content.includes(keyword)) ||
           promoSenders.some(sender => from.email?.includes(sender));
  }
  
  isSocialEmail(content, from) {
    const socialKeywords = ['facebook', 'twitter', 'instagram', 'linkedin', 'social', 'friend', 'follow', 'like', 'share'];
    const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com'];
    
    return socialKeywords.some(keyword => content.includes(keyword)) ||
           socialDomains.some(domain => from.email?.includes(domain));
  }
  
  isUpdateEmail(content, from) {
    const updateKeywords = ['update', 'notification', 'alert', 'news', 'announcement', 'changelog', 'version'];
    const updateSenders = ['updates', 'notifications', 'alerts', 'news'];
    
    return updateKeywords.some(keyword => content.includes(keyword)) ||
           updateSenders.some(sender => from.email?.includes(sender));
  }
  
  isPersonalEmail(content, from) {
    const personalKeywords = ['family', 'friend', 'personal', 'birthday', 'wedding', 'vacation', 'dinner', 'lunch'];
    
    return personalKeywords.some(keyword => content.includes(keyword));
  }
  
  isUrgentEmail(content, subject) {
    const urgentKeywords = ['urgent', 'asap', 'immediate', 'emergency', 'critical', 'important', 'deadline', 'today'];
    
    return urgentKeywords.some(keyword => content.includes(keyword) || subject?.toLowerCase().includes(keyword));
  }
  
  analyzeSentiment(content) {
    const positiveWords = ['great', 'excellent', 'good', 'happy', 'pleased', 'wonderful', 'amazing', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'disappointed', 'angry', 'frustrated', 'problem', 'issue'];
    
    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  generateSummary(subject, body) {
    if (!body || body.length < 50) {
      return subject || 'No content available';
    }
    
    // Simple summary: first sentence or first 100 characters
    const firstSentence = body.split('.')[0];
    if (firstSentence.length > 10 && firstSentence.length < 150) {
      return firstSentence.trim() + '.';
    }
    
    return body.substring(0, 100).trim() + '...';
  }
  
  extractActionItems(content) {
    const actionKeywords = ['please', 'need to', 'should', 'must', 'required', 'deadline', 'due', 'action', 'todo'];
    const actionItems = [];
    
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (actionKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 10 && cleanSentence.length < 200) {
          actionItems.push(cleanSentence);
        }
      }
    }
    
    return actionItems.slice(0, 3); // Limit to 3 action items
  }
}

export default new EmailProcessingService();
