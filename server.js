import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  try {
    // Import backend app and httpServer
    const { app: backendApp, httpServer, io } = await import('./backend/src/app.js');
    
    const app = express();
    const PORT = process.env.PORT || 5001;
    
    // Serve static frontend files from dist directory
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    
    // Mount backend API routes under /api prefix
    app.use('/api', backendApp);
    
    // Health check endpoint at root
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'smart-email-navigator',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });
    
    // Serve React app for all other routes (client-side routing)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    // Use the httpServer from backend (which has Socket.IO attached)
    httpServer.on('request', app);
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`
========================================
🚀 Smart Email Navigator AI Running
========================================
📍 Server Port: ${PORT}
🌐 Frontend: http://localhost:${PORT}
🔌 Backend API: http://localhost:${PORT}/api
🏥 Health Check: http://localhost:${PORT}/health
📡 WebSocket: Connected via Socket.IO
🔧 Environment: ${process.env.NODE_ENV || 'development'}
========================================
      `);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the unified server
startServer();