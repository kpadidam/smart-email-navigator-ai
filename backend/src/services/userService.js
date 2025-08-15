import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

class UserService {
  /**
   * Find a user by email
   */
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  /**
   * Find a user by ID
   */
  async findById(id) {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * Create a new user
   */
  async create(userData) {
    // Hash password if provided
    if (userData.password) {
      const salt = await bcrypt.genSalt(12);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    return await prisma.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase()
      }
    });
  }

  /**
   * Update user by ID
   */
  async update(id, updateData) {
    // If updating password, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Compare password
   */
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update Gmail tokens
   */
  async updateGmailTokens(userId, tokens) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        gmailTokens: tokens,
        gmailConnected: true,
        gmailConnectedAt: new Date()
      }
    });
  }

  /**
   * Get user with Gmail tokens (for authenticated requests)
   */
  async getUserWithTokens(userId) {
    return await prisma.user.findUnique({
      where: { id: userId }
    });
  }
}

export default new UserService();