import { logger, logInfo, logError } from '../utils/logger.js';

class EmailCategorizationService {
  constructor() {
    // Define categorization rules
    this.rules = {
      social: {
        domains: [
          'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
          'snapchat.com', 'tiktok.com', 'youtube.com', 'pinterest.com'
        ],
        keywords: [
          'social', 'friend request', 'connection', 'follow', 'like',
          'comment', 'share', 'post', 'story', 'notification'
        ],
        senders: [
          'noreply@facebook.com', 'notify@twitter.com', 'messages-noreply@linkedin.com'
        ]
      },
      promotions: {
        keywords: [
          'sale', 'discount', 'offer', 'deal', 'coupon', 'promo', 'special',
          'limited time', 'exclusive', 'save', 'free shipping', 'clearance',
          'black friday', 'cyber monday', 'flash sale', 'unsubscribe'
        ],
        senders: [
          'noreply', 'marketing', 'promotions', 'offers', 'deals'
        ],
        subjects: [
          'newsletter', 'weekly digest', 'monthly update'
        ]
      },
      updates: {
        keywords: [
          'notification', 'alert', 'reminder', 'update', 'confirmation',
          'receipt', 'invoice', 'statement', 'report', 'summary',
          'security', 'password', 'account', 'billing'
        ],
        senders: [
          'no-reply', 'donotreply', 'automated', 'system', 'support'
        ]
      },
      forums: {
        keywords: [
          'forum', 'discussion', 'thread', 'reply', 'comment',
          'community', 'group', 'board', 'topic'
        ],
        domains: [
          'reddit.com', 'stackoverflow.com', 'github.com', 'discourse.org'
        ]
      },
      spam: {
        keywords: [
          'viagra', 'casino', 'lottery', 'winner', 'congratulations',
          'urgent', 'act now', 'limited time', 'click here', 'free money',
          'make money fast', 'work from home', 'lose weight'
        ],
        suspiciousPatterns: [
          /\$\d+,?\d*\s*(million|thousand)/i,
          /you.*(won|win).*(lottery|prize)/i,
          /urgent.*(action|response).*(required|needed)/i
        ]
      }
    };

    // Priority scoring weights
    this.priorityWeights = {
      keywords: {
        urgent: 10,
        important: 8,
        asap: 9,
        deadline: 7,
        meeting: 6,
        interview: 9,
        contract: 8,
        invoice: 7,
        payment: 7,
        security: 9,
        alert: 8
      },
      senders: {
        boss: 10,
        manager: 8,
        client: 9,
        customer: 7,
        hr: 8,
        finance: 7,
        legal: 9,
        security: 10
      }
    };
  }

  // Main categorization method
  categorizeEmail(emailData) {
    try {
      const subject = emailData.subject?.toLowerCase() || '';
      const fromEmail = emailData.from?.email?.toLowerCase() || '';
      const fromName = emailData.from?.name?.toLowerCase() || '';
      const bodyText = emailData.body?.text?.toLowerCase() || '';

      // Check for spam first
      if (this.isSpam(subject, fromEmail, bodyText)) {
        return {
          category: 'spam',
          confidence: 0.9,
          reason: 'Spam detection rules'
        };
      }

      // Check each category
      const scores = {
        social: this.calculateCategoryScore('social', subject, fromEmail, fromName, bodyText),
        promotions: this.calculateCategoryScore('promotions', subject, fromEmail, fromName, bodyText),
        updates: this.calculateCategoryScore('updates', subject, fromEmail, fromName, bodyText),
        forums: this.calculateCategoryScore('forums', subject, fromEmail, fromName, bodyText)
      };

      // Find the highest scoring category
      const maxScore = Math.max(...Object.values(scores));
      const bestCategory = Object.keys(scores).find(cat => scores[cat] === maxScore);

      // If no category has a significant score, default to primary
      if (maxScore < 0.3) {
        return {
          category: 'primary',
          confidence: 0.8,
          reason: 'Default categorization'
        };
      }

      return {
        category: bestCategory,
        confidence: Math.min(maxScore, 0.95),
        reason: `Matched ${bestCategory} patterns`,
        scores
      };

    } catch (error) {
      logError(error, { 
        service: 'EmailCategorizationService.categorizeEmail',
        subject: emailData.subject 
      });
      
      return {
        category: 'primary',
        confidence: 0.5,
        reason: 'Error in categorization, defaulted to primary'
      };
    }
  }

  // Calculate priority score for an email
  calculatePriority(emailData) {
    try {
      const subject = emailData.subject?.toLowerCase() || '';
      const fromEmail = emailData.from?.email?.toLowerCase() || '';
      const fromName = emailData.from?.name?.toLowerCase() || '';
      const bodyText = emailData.body?.text?.toLowerCase() || '';

      let score = 0;
      const reasons = [];

      // Check priority keywords in subject
      Object.entries(this.priorityWeights.keywords).forEach(([keyword, weight]) => {
        if (subject.includes(keyword)) {
          score += weight;
          reasons.push(`Subject contains "${keyword}"`);
        }
      });

      // Check priority keywords in body
      Object.entries(this.priorityWeights.keywords).forEach(([keyword, weight]) => {
        if (bodyText.includes(keyword)) {
          score += weight * 0.5; // Lower weight for body matches
          reasons.push(`Body contains "${keyword}"`);
        }
      });

      // Check sender importance
      Object.entries(this.priorityWeights.senders).forEach(([senderType, weight]) => {
        if (fromEmail.includes(senderType) || fromName.includes(senderType)) {
          score += weight;
          reasons.push(`Sender appears to be ${senderType}`);
        }
      });

      // Check for time-sensitive patterns
      const timePatterns = [
        /today/i, /tomorrow/i, /deadline/i, /expires?/i, /urgent/i, /asap/i
      ];
      
      timePatterns.forEach(pattern => {
        if (pattern.test(subject) || pattern.test(bodyText)) {
          score += 5;
          reasons.push('Contains time-sensitive language');
        }
      });

      // Determine priority level
      let priority;
      if (score >= 15) {
        priority = 'urgent';
      } else if (score >= 10) {
        priority = 'high';
      } else if (score >= 5) {
        priority = 'normal';
      } else {
        priority = 'low';
      }

      return {
        priority,
        score,
        reasons,
        confidence: Math.min(score / 20, 0.95)
      };

    } catch (error) {
      logError(error, { 
        service: 'EmailCategorizationService.calculatePriority',
        subject: emailData.subject 
      });
      
      return {
        priority: 'normal',
        score: 0,
        reasons: ['Error in priority calculation'],
        confidence: 0.5
      };
    }
  }

  // Calculate category score
  calculateCategoryScore(category, subject, fromEmail, fromName, bodyText) {
    const rules = this.rules[category];
    let score = 0;

    // Check domain matches
    if (rules.domains) {
      rules.domains.forEach(domain => {
        if (fromEmail.includes(domain)) {
          score += 0.8;
        }
      });
    }

    // Check keyword matches
    if (rules.keywords) {
      rules.keywords.forEach(keyword => {
        if (subject.includes(keyword)) {
          score += 0.6;
        }
        if (bodyText.includes(keyword)) {
          score += 0.3;
        }
      });
    }

    // Check sender patterns
    if (rules.senders) {
      rules.senders.forEach(sender => {
        if (fromEmail.includes(sender) || fromName.includes(sender)) {
          score += 0.7;
        }
      });
    }

    // Check subject patterns
    if (rules.subjects) {
      rules.subjects.forEach(subjectPattern => {
        if (subject.includes(subjectPattern)) {
          score += 0.5;
        }
      });
    }

    return Math.min(score, 1.0);
  }

  // Check if email is spam
  isSpam(subject, fromEmail, bodyText) {
    const spamRules = this.rules.spam;

    // Check spam keywords
    const spamKeywordCount = spamRules.keywords.filter(keyword => 
      subject.includes(keyword) || bodyText.includes(keyword)
    ).length;

    if (spamKeywordCount >= 2) {
      return true;
    }

    // Check suspicious patterns
    const suspiciousPatternCount = spamRules.suspiciousPatterns.filter(pattern =>
      pattern.test(subject) || pattern.test(bodyText)
    ).length;

    if (suspiciousPatternCount >= 1) {
      return true;
    }

    // Check for excessive capitalization
    const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
    if (capsRatio > 0.7 && subject.length > 10) {
      return true;
    }

    // Check for suspicious sender patterns
    if (fromEmail.match(/[0-9]{5,}/) || fromEmail.includes('temp') || fromEmail.includes('fake')) {
      return true;
    }

    return false;
  }

  // Batch categorize multiple emails
  async categorizeEmailBatch(emails) {
    const results = [];
    
    for (const email of emails) {
      try {
        const categoryResult = this.categorizeEmail(email);
        const priorityResult = this.calculatePriority(email);
        
        results.push({
          emailId: email._id || email.id,
          category: categoryResult.category,
          categoryConfidence: categoryResult.confidence,
          priority: priorityResult.priority,
          priorityConfidence: priorityResult.confidence,
          reasons: {
            category: categoryResult.reason,
            priority: priorityResult.reasons
          }
        });
      } catch (error) {
        logError(error, { 
          service: 'EmailCategorizationService.categorizeEmailBatch',
          emailId: email._id || email.id 
        });
        
        results.push({
          emailId: email._id || email.id,
          category: 'primary',
          categoryConfidence: 0.5,
          priority: 'normal',
          priorityConfidence: 0.5,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Add custom rule
  addCustomRule(category, rule) {
    if (!this.rules[category]) {
      this.rules[category] = {};
    }
    
    Object.assign(this.rules[category], rule);
    
    logInfo('Custom categorization rule added', { category, rule });
  }

  // Get categorization statistics
  getCategoryStats(emails) {
    const stats = {
      total: emails.length,
      categories: {},
      priorities: {},
      confidence: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    emails.forEach(email => {
      // Count categories
      stats.categories[email.category] = (stats.categories[email.category] || 0) + 1;
      
      // Count priorities
      stats.priorities[email.priority] = (stats.priorities[email.priority] || 0) + 1;
      
      // Count confidence levels (assuming confidence is stored)
      if (email.categoryConfidence >= 0.8) {
        stats.confidence.high++;
      } else if (email.categoryConfidence >= 0.6) {
        stats.confidence.medium++;
      } else {
        stats.confidence.low++;
      }
    });

    return stats;
  }
}

export const emailCategorizationService = new EmailCategorizationService();
