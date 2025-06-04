import { logger } from '../utils/logger.js';

export const handleEmailSocket = (io, socket) => {
  const userId = socket.userId;
  
  // Join user to their personal room
  socket.join(userId);
  logger.info(`User ${userId} joined their socket room`);

  // Handle client events
  socket.on('email:subscribe', () => {
    logger.info(`User ${userId} subscribed to email updates`);
    socket.emit('email:subscribed', { 
      message: 'Successfully subscribed to email updates',
      timestamp: new Date()
    });
  });

  socket.on('email:unsubscribe', () => {
    logger.info(`User ${userId} unsubscribed from email updates`);
    socket.emit('email:unsubscribed', { 
      message: 'Unsubscribed from email updates',
      timestamp: new Date()
    });
  });

  socket.on('dashboard:subscribe', () => {
    logger.info(`User ${userId} subscribed to dashboard updates`);
    socket.emit('dashboard:subscribed', { 
      message: 'Successfully subscribed to dashboard updates',
      timestamp: new Date()
    });
  });

  socket.on('dashboard:unsubscribe', () => {
    logger.info(`User ${userId} unsubscribed from dashboard updates`);
    socket.emit('dashboard:unsubscribed', { 
      message: 'Unsubscribed from dashboard updates',
      timestamp: new Date()
    });
  });

  socket.on('email:mark_read', (data) => {
    logger.info(`User ${userId} marked email ${data.emailId} as read`);
    // Broadcast to all user's connected clients
    io.to(userId).emit('email:status_changed', {
      emailId: data.emailId,
      status: 'read',
      timestamp: new Date()
    });
  });

  socket.on('email:mark_unread', (data) => {
    logger.info(`User ${userId} marked email ${data.emailId} as unread`);
    // Broadcast to all user's connected clients
    io.to(userId).emit('email:status_changed', {
      emailId: data.emailId,
      status: 'unread',
      timestamp: new Date()
    });
  });

  socket.on('email:star', (data) => {
    logger.info(`User ${userId} starred email ${data.emailId}`);
    // Broadcast to all user's connected clients
    io.to(userId).emit('email:status_changed', {
      emailId: data.emailId,
      status: 'starred',
      timestamp: new Date()
    });
  });

  socket.on('email:unstar', (data) => {
    logger.info(`User ${userId} unstarred email ${data.emailId}`);
    // Broadcast to all user's connected clients
    io.to(userId).emit('email:status_changed', {
      emailId: data.emailId,
      status: 'unstarred',
      timestamp: new Date()
    });
  });

  socket.on('disconnect', (reason) => {
    logger.info(`User ${userId} disconnected: ${reason}`);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for user ${userId}:`, error);
  });

  // Send welcome message
  socket.emit('connected', { 
    message: 'Connected to real-time email updates',
    userId: userId,
    timestamp: new Date()
  });
};

// Helper function to emit email events to a specific user
export const emitToUser = (io, userId, event, data) => {
  io.to(userId).emit(event, {
    ...data,
    timestamp: new Date()
  });
};

// Helper function to emit dashboard updates to a specific user
export const emitDashboardUpdate = (io, userId, stats) => {
  io.to(userId).emit('dashboard:stats_updated', {
    ...stats,
    timestamp: new Date()
  });
};
