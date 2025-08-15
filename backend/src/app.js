import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure environment variables from root directory
dotenv.config({ path: join(__dirname, '../../.env') });

import express from 'express';                                                                                                                                                                         
import cors from 'cors';                                                                                                                                                                               
import helmet from 'helmet';                                                                                                                                                                           
import rateLimit from 'express-rate-limit';                                                                                                                                                            
import { createServer } from 'http';                                                                                                                                                                   
import { Server } from 'socket.io';
import { connectDB } from './config/database.js';                                                                                                                                                                    
                                                                                                                                                                                                       
// Import routes                                                                                                                                                                                       
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';                                                                                                                                                          
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';                                                                                                                                                   
                                                                                                                                                                                                       
// Import middleware                                                                                                                                                                                   
import { errorHandler } from './middleware/errorHandler.js';                                                                                                                                           
import { logger } from './utils/logger.js';                                                                                                                                                            
import { authenticateSocket } from './middleware/socketAuth.js';                                                                                                                                       
import { handleEmailSocket } from './sockets/emailSocket.js';                                                                                                                                                                                       
                                                                                                                                                                                                       
const app = express();                                                                                                                                                                                 
const httpServer = createServer(app);                                                                                                                                                                      
                                                                                                                                                                                                       
// CORS configuration - Updated to include all frontend origins including Lovable
const allowedOrigins = [
  /\.lovable\.app$/,
  /\.railway\.app$/,  // Allow all Railway apps
  /\.vercel\.app$/,   // Allow Vercel deployments
  /\.netlify\.app$/,  // Allow Netlify deployments
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://10.0.0.131:8080",
  "http://10.0.0.131:8081",
  "http://10.0.0.131:8082",
  "http://192.168.110.188:8080",
  "http://192.168.110.188:8081",
  "http://192.168.110.188:8082",
  "http://192.168.110.14:8080",
  "http://192.168.110.14:8081",
  "http://192.168.110.14:8082",
  process.env.FRONTEND_URL,
  process.env.PRODUCTION_FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any of our allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};                                                                                                                                                                                                     
                                                                                                                                                                                                       
// Initialize Socket.IO with CORS                                                                                                                                                                        
const io = new Server(httpServer, {                                                                                                                                                                        
  cors: corsOptions                                                                                                                                                                                      
});                                                                                                                                                                                                    
                                                                                                                                                                                                       
// Socket.IO authentication middleware                                                                                                                                                                 
io.use(authenticateSocket);                                                                                                                                                                            
                                                                                                                                                                                                       
// Socket.IO connection handling                                                                                                                                                                       
io.on('connection', (socket) => {                                                                                                                                                                      
  logger.info(`New socket connection: ${socket.id} for user: ${socket.userId}`);                                                                                                                       
  handleEmailSocket(io, socket);                                                                                                                                                                       
});                                                                                                                                                                                                    
                                                                                                                                                                                                       
// Export io instance for use in other modules                                                                                                                                                         
export const getIO = () => io;                                                                                                                                                                              
                                                                                                                                                                                                       
// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    }
  });
  next();
});

// URL sanitization middleware - Clean up URLs with trailing newlines/whitespace
app.use((req, res, next) => {
  const originalUrl = req.url;
  
  // Remove URL-encoded newlines, carriage returns, and whitespace from the end
  req.url = req.url.replace(/%0A|%0D|%20$/g, '').trim();
  
  // Also clean the originalUrl (but not path as it's read-only)
  if (req.originalUrl) {
    req.originalUrl = req.originalUrl.replace(/%0A|%0D|%20$/g, '').trim();
  }
  
  // Log URL sanitization if changes were made
  if (originalUrl !== req.url) {
    logger.info('URL sanitized', { 
      original: originalUrl, 
      sanitized: req.url,
      method: req.method 
    });
  }
  
  next();
});                                                                                                                                                                                                    
                                                                                                                                                                                                       
// Apply CORS before other middleware                                                                                                                                                                    
app.use(cors(corsOptions));                                                                                                                                                                              
                                                                                                                                                                                                       
// Security middleware                                                                                                                                                                                 
app.use(helmet({                                                                                                                                                                                         
  crossOriginResourcePolicy: { policy: "cross-origin" },                                                                                                                                                      
  crossOriginOpenerPolicy: { policy: "unsafe-none" }                                                                                                                                                      
}));                                                                                                                                                                                                   
                                                                                                                                                                                                       
// Rate limiting                                                                                                                                                                                       
const limiter = rateLimit({                                                                                                                                                                            
  windowMs: 15 * 60 * 1000, // 15 minutes                                                                                                                                                              
  max: 100, // limit each IP to 100 requests per windowMs                                                                                                                                              
  message: 'Too many requests from this IP, please try again later.'                                                                                                                                   
});                                                                                                                                                                                                    
app.use(limiter);                                                                                                                                                                                      
                                                                                                                                                                                                       
// Body parsing middleware                                                                                                                                                                             
app.use(express.json({ limit: '10mb' }));                                                                                                                                                              
app.use(express.urlencoded({ extended: true }));                                                                                                                                                       
                                                                                                                                                                                                       
// Connect to PostgreSQL via Prisma                                                                                                                                                                                  
connectDB();                                                                                                                                       
                                                                                                                                                                                                       
// Routes                                                                                                                                                                                              
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);                                                                                                                                                            
                                                                                                                                                                                                       
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    socketConnections: io.engine.clientsCount
  });
});

// API Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Email Navigator API is running',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    socketConnections: io.engine.clientsCount
  });
});                                                                                                                                                                                                    
                                                                                                                                                                                                       
// Error handling middleware                                                                                                                                                                           
app.use(errorHandler);                                                                                                                                                                                 
                                                                                                                                                                                                       
// 404 handler                                                                                                                                                                                         
app.use('*', (req, res) => {                                                                                                                                                                           
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);                                                                                                                                      
  res.status(404).json({ error: 'Route not found' });                                                                                                                                                  
});                                                                                                                                                                                                    
                                                                                                                                                                                                       
// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 5001;                                                                                                                                                                 
  httpServer.listen(PORT, '0.0.0.0', () => {                                                                                                                                                                            
    logger.info(`Server is running on port ${PORT} and accessible from all interfaces`);                                                                                                                                                       
    logger.info(`Socket.IO server initialized`);                                                                                                                                                         
  });
}                                                                                                                                                                                                    
                                                                                                                                                                                                       
export { app, httpServer, io };
export default app;  
