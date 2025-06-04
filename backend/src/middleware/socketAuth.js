import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export const authenticateSocket = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace('Bearer ', '');

    // Verify JWT token
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.userId = user._id.toString();
    socket.user = user;
    
    logger.info(`Socket authenticated for user: ${user.email}`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};
