import prisma from '../config/database.js';

class EmailAccountService {
  /**
   * Create a new email account
   */
  async create(accountData) {
    return await prisma.emailAccount.create({
      data: {
        ...accountData,
        provider: accountData.provider?.toUpperCase() || 'GMAIL'
      }
    });
  }

  /**
   * Find email account by ID and user ID
   */
  async findByIdAndUser(id, userId) {
    return await prisma.emailAccount.findFirst({
      where: { id, userId, isActive: true }
    });
  }

  /**
   * Find email account by email and user ID
   */
  async findByEmailAndUser(email, userId) {
    return await prisma.emailAccount.findFirst({
      where: { email, userId }
    });
  }

  /**
   * Get all email accounts for a user
   */
  async findByUser(userId) {
    return await prisma.emailAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        email: true,
        provider: true,
        lastSyncAt: true,
        createdAt: true
      }
    });
  }

  /**
   * Update email account
   */
  async update(id, updateData) {
    return await prisma.emailAccount.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Update tokens for email account
   */
  async updateTokens(id, accessToken, refreshToken, tokenExpiry) {
    return await prisma.emailAccount.update({
      where: { id },
      data: {
        accessToken,
        refreshToken,
        tokenExpiry
      }
    });
  }

  /**
   * Update last sync time
   */
  async updateLastSync(id) {
    return await prisma.emailAccount.update({
      where: { id },
      data: { lastSyncAt: new Date() }
    });
  }

  /**
   * Check if email account exists for any user
   */
  async existsByEmail(email) {
    const account = await prisma.emailAccount.findFirst({
      where: { email }
    });
    return !!account;
  }
}

export default new EmailAccountService();