import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.promptTemplate = `Analyze this email and provide:
1. Category: meetings, delivery, interviews, other
2. Priority: high, medium, low
3. Summary (max 100 words)
4. Extract date/time if mentioned

Email: {{emailContent}}

Respond in JSON format:
{
  "category": "meetings|delivery|interviews|other",
  "priority": "high|medium|low", 
  "summary": "string (max 100 words)",
  "datetime": "ISO date string or null"
}`;
  }

  /**
   * Classify and summarize email using OpenAI
   * @param {Object} emailData - Email content to analyze
   * @returns {Promise<Object>} AIEmailResult
   */
  async classifyAndSummarize(emailData) {
    try {
      const startTime = Date.now();
      
      // Prepare email content
      const emailContent = this.prepareEmailContent(emailData);
      const prompt = this.promptTemplate.replace('{{emailContent}}', emailContent);

      logger.info('Starting OpenAI classification', {
        subject: emailData.subject,
        contentLength: emailContent.length
      });

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert email classifier. Always respond with valid JSON matching the exact schema provided."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0].message.content;
      const result = JSON.parse(responseText);
      
      const duration = Date.now() - startTime;
      
      // Validate and format response
      const aiResult = this.validateAndFormatResult(result, duration);
      
      logger.info('OpenAI classification completed', {
        subject: emailData.subject,
        category: aiResult.category,
        priority: aiResult.priority,
        duration: `${duration}ms`,
        tokens: completion.usage?.total_tokens
      });

      return aiResult;

    } catch (error) {
      logger.error('OpenAI classification error', {
        error: error.message,
        subject: emailData.subject,
        stack: error.stack
      });

      // Return fallback classification
      return this.getFallbackClassification(emailData);
    }
  }

  /**
   * Prepare email content for OpenAI analysis
   */
  prepareEmailContent(emailData) {
    const subject = emailData.subject || '';
    const bodyText = emailData.body?.text || '';
    const bodyHtml = emailData.body?.html || '';
    const fromEmail = emailData.from?.email || '';
    const fromName = emailData.from?.name || '';

    // Use text body if available, otherwise extract from HTML
    let content = bodyText;
    if (!content && bodyHtml) {
      // Simple HTML to text conversion (remove tags)
      content = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Limit content length to avoid token limits
    const maxLength = 2000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    return `Subject: ${subject}
From: ${fromName} <${fromEmail}>
Content: ${content}`;
  }

  /**
   * Validate and format OpenAI response
   */
  validateAndFormatResult(result, duration) {
    // Validate category
    const validCategories = ['meetings', 'delivery', 'interviews', 'other'];
    const category = validCategories.includes(result.category) ? result.category : 'other';

    // Validate priority  
    const validPriorities = ['high', 'medium', 'low'];
    const priority = validPriorities.includes(result.priority) ? result.priority : 'medium';

    // Validate summary length
    let summary = result.summary || 'No summary available';
    if (summary.length > 100) {
      summary = summary.substring(0, 97) + '...';
    }

    // Validate datetime
    let datetime = null;
    if (result.datetime) {
      try {
        datetime = new Date(result.datetime).toISOString();
      } catch (e) {
        datetime = null;
      }
    }

    return {
      category,
      priority,
      summary,
      datetime,
      confidence: 0.9, // High confidence for OpenAI results
      processedAt: new Date(),
      processingTime: duration
    };
  }

  /**
   * Fallback classification when OpenAI fails
   */
  getFallbackClassification(emailData) {
    const subject = (emailData.subject || '').toLowerCase();
    const content = (emailData.body?.text || emailData.body?.html || '').toLowerCase();
    
    let category = 'other';
    let priority = 'medium';

    // Simple rule-based fallback
    if (subject.includes('meeting') || subject.includes('calendar') || content.includes('meeting')) {
      category = 'meetings';
      priority = 'high';
    } else if (subject.includes('delivery') || subject.includes('shipped') || content.includes('tracking')) {
      category = 'delivery';
      priority = 'medium';
    } else if (subject.includes('interview') || content.includes('interview')) {
      category = 'interviews';
      priority = 'high';
    }

    return {
      category,
      priority,
      summary: emailData.subject || 'No summary available',
      datetime: null,
      confidence: 0.3, // Low confidence for fallback
      processedAt: new Date(),
      processingTime: 0
    };
  }

  /**
   * Batch process multiple emails
   */
  async processBatch(emails) {
    const results = [];
    const batchSize = 5; // Process in small batches to avoid rate limits
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.classifyAndSummarize(email));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error('Batch processing error', { batchStart: i, error: error.message });
        // Add fallback results for failed batch
        const fallbackResults = batch.map(email => this.getFallbackClassification(email));
        results.push(...fallbackResults);
      }
    }
    
    return results;
  }

  /**
   * Health check for OpenAI service
   */
  async healthCheck() {
    try {
      const testEmail = {
        subject: 'Test email',
        body: { text: 'This is a test email for health check.' },
        from: { email: 'test@example.com', name: 'Test User' }
      };
      
      const result = await this.classifyAndSummarize(testEmail);
      return {
        status: 'healthy',
        latency: result.processingTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Lazy initialization to ensure environment variables are loaded
let openaiServiceInstance = null;

export const getOpenAIService = () => {
  if (!openaiServiceInstance) {
    openaiServiceInstance = new OpenAIService();
  }
  return openaiServiceInstance;
};

// Export a proxy object that delays instantiation
export const openaiService = {
  classifyAndSummarize: (...args) => getOpenAIService().classifyAndSummarize(...args),
  processBatch: (...args) => getOpenAIService().processBatch(...args),
  healthCheck: (...args) => getOpenAIService().healthCheck(...args)
}; 