import prisma from '../config/database.js';

class EmailDbService {
  /**
   * Create a new email
   */
  async create(emailData) {
    // Transform the data to match Prisma schema
    const transformedData = {
      ...emailData,
      fromName: emailData.from?.name || null,
      fromEmail: emailData.from?.email || emailData.from || '',
      bodyText: emailData.body?.text || null,
      bodyHtml: emailData.body?.html || null,
      aiCategory: emailData.aiAnalysis?.category?.toUpperCase() || null,
      aiPriority: emailData.aiAnalysis?.priority?.toUpperCase() || null,
      aiSentiment: emailData.aiAnalysis?.sentiment?.toUpperCase() || null,
      aiSummary: emailData.aiAnalysis?.summary || null,
      aiActionItems: emailData.aiAnalysis?.actionItems || [],
      aiConfidence: emailData.aiAnalysis?.confidence || null,
      aiProcessedAt: emailData.aiAnalysis?.processedAt || null
    };

    // Remove nested objects that are now flattened
    delete transformedData.from;
    delete transformedData.body;
    delete transformedData.aiAnalysis;

    return await prisma.email.create({
      data: transformedData
    });
  }

  /**
   * Find emails by user ID with filtering
   */
  async findByUser(userId, filters = {}) {
    const { category, search, limit = 20, offset = 0, accountId } = filters;

    const where = { userId };

    if (accountId) {
      where.accountId = accountId;
    }

    if (category && category !== 'all') {
      where.aiCategory = category.toUpperCase();
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
        { fromEmail: { contains: search, mode: 'insensitive' } },
        { bodyText: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.email.count({ where })
    ]);

    return { emails, total };
  }

  /**
   * Find email by ID and user ID
   */
  async findByIdAndUser(id, userId) {
    return await prisma.email.findFirst({
      where: { id, userId }
    });
  }

  /**
   * Check if email exists by Gmail ID and user ID
   */
  async existsByGmailId(gmailId, userId, accountId) {
    const email = await prisma.email.findFirst({
      where: { gmailId, userId, accountId }
    });
    return !!email;
  }

  /**
   * Update email
   */
  async update(id, userId, updateData) {
    // Transform category/priority/sentiment if present
    if (updateData.aiAnalysis) {
      if (updateData.aiAnalysis.category) {
        updateData.aiCategory = updateData.aiAnalysis.category.toUpperCase();
      }
      if (updateData.aiAnalysis.priority) {
        updateData.aiPriority = updateData.aiAnalysis.priority.toUpperCase();
      }
      if (updateData.aiAnalysis.sentiment) {
        updateData.aiSentiment = updateData.aiAnalysis.sentiment.toUpperCase();
      }
      if (updateData.aiAnalysis.summary) {
        updateData.aiSummary = updateData.aiAnalysis.summary;
      }
      delete updateData.aiAnalysis;
    }

    return await prisma.email.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Get email statistics
   */
  async getStats(userId, accountId = null) {
    const where = { userId };
    if (accountId) {
      where.accountId = accountId;
    }

    const [totalEmails, unreadEmails, categorizedEmails, pendingActions] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.count({ where: { ...where, isRead: false } }),
      prisma.email.count({ where: { ...where, aiCategory: { not: null } } }),
      prisma.email.count({ where: { ...where, isRead: false, isStarred: false } })
    ]);

    return {
      totalEmails,
      unreadEmails,
      categorizedEmails,
      pendingActions
    };
  }

  /**
   * Get category counts
   */
  async getCategoryCounts(userId) {
    const categories = await prisma.email.groupBy({
      by: ['aiCategory'],
      where: { userId },
      _count: true
    });

    return categories.map(cat => ({
      category: cat.aiCategory?.toLowerCase() || 'other',
      count: cat._count
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Mark email as read
   */
  async markAsRead(id, userId) {
    return await prisma.email.update({
      where: { id },
      data: { isRead: true }
    });
  }
}

export default new EmailDbService();