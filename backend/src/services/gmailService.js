import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

let io = null;

/**
 * Initialize the Socket.IO server with CORS and auth middleware.
 * @param {http.Server} httpServer
 */
export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Update to your frontend URL in production
      methods: ['GET', 'POST']
    }
  });

  // Middleware for authenticating socket connections using JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      socket.join(user._id.toString());
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // Handle new socket connections
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email}`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.email}`);
    });
  });
};

/**
 * Get the initialized Socket.IO instance
 */
export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
