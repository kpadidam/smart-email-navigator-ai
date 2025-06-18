import express from 'express';                                                                                                                                                                         
import cors from 'cors';                                                                                                                                                                               
import helmet from 'helmet';                                                                                                                                                                           
import dotenv from 'dotenv';                                                                                                                                                                           
import mongoose from 'mongoose';                                                                                                                                                                       
import rateLimit from 'express-rate-limit';                                                                                                                                                            
import { createServer } from 'http';                                                                                                                                                                   
import { Server } from 'socket.io';                                                                                                                                                                    
                                                                                                                                                                                                       
// Import routes                                                                                                                                                                                       
import authRoutes from './routes/auth.js';                                                                                                                                                             
import emailRoutes from './routes/emails.js';                                                                                                                                                          
import dashboardRoutes from './routes/dashboard.js';                                                                                                                                                   
                                                                                                                                                                                                       
// Import middleware                                                                                                                                                                                   
import { errorHandler } from './middleware/errorHandler.js';                                                                                                                                           
import { logger } from './utils/logger.js';                                                                                                                                                            
import { authenticateSocket } from './middleware/socketAuth.js';                                                                                                                                       
import { handleEmailSocket } from './sockets/emailSocket.js';                                                                                                                                          
                                                                                                                                                                                                       
dotenv.config();                                                                                                                                                                                       
                                                                                                                                                                                                       
const app = express();                                                                                                                                                                                 
const httpServer = createServer(app);                                                                                                                                                                      
                                                                                                                                                                                                       
// CORS configuration - Updated to include all frontend origins                                                                                                                                       
const corsOptions = {                                                                                                                                                                                  
  origin: [                                                                                                                                                                                              
    'http://localhost:8080',                                                                                                                                                                              
    'http://localhost:8081',                                                                                                                                                                              
    'http://localhost:8081',                                                                                                                                                                              
    'http://10.0.0.131:8080',                                                                                                                                                                              
    'http://10.0.0.131:8081',                                                                                                                                                                              
    'http://10.0.0.131:8081',                                                                                                                                                                              
    process.env.FRONTEND_URL                                                                                                                                                                              
  ].filter(Boolean),                                                                                                                                                                                      
  methods: ['GET', 'POST', 'OPTIONS'],                                                                                                                                                                  
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
                                                                                                                                                                                                       
// Connect to MongoDB                                                                                                                                                                                  
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/email-management')                                                                                                              
  .then(() => logger.info('Connected to MongoDB'))                                                                                                                                                     
  .catch(err => logger.error('MongoDB connection error:', err));                                                                                                                                       
                                                                                                                                                                                                       
// Routes                                                                                                                                                                                              
app.use('/api/auth', authRoutes);                                                                                                                                                                      
app.use('/api/emails', emailRoutes);                                                                                                                                                                   
app.use('/api/dashboard', dashboardRoutes);                                                                                                                                                            
                                                                                                                                                                                                       
// Health check endpoint                                                                                                                                                                               
app.get('/health', (req, res) => {                                                                                                                                                                     
  res.status(200).json({                                                                                                                                                                               
    status: 'OK',                                                                                                                                                                                      
    timestamp: new Date().toISOString(),                                                                                                                                                               
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
                                                                                                                                                                                                       
const PORT = process.env.PORT || 5001;                                                                                                                                                                 
httpServer.listen(PORT, () => {                                                                                                                                                                            
  logger.info(`Server is running on port ${PORT}`);                                                                                                                                                       
  logger.info(`Socket.IO server initialized`);                                                                                                                                                         
});                                                                                                                                                                                                    
                                                                                                                                                                                                       
export default app;  
