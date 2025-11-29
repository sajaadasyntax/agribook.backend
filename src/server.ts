import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { logInfo, logError } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

// Routes
import userRoutes from './routes/users.routes';
import transactionRoutes from './routes/transactions.routes';
import categoryRoutes from './routes/categories.routes';
import reportRoutes from './routes/reports.routes';
import alertRoutes from './routes/alerts.routes';
import reminderRoutes from './routes/reminders.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// CORS Configuration
const corsOrigins = process.env.CORS_ORIGINS;
const corsOptions = {
  origin: corsOrigins === '*' || !corsOrigins 
    ? true 
    : corsOrigins.split(',').map(origin => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Trust proxy (important for deployments behind Nginx/load balancer)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/logos', express.static(path.join(__dirname, '../uploads/logos')));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  logInfo('Health check', {});
  res.json({ status: 'ok', message: 'AgriBooks API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  logError('Route not found', new Error('404'), { method: req.method, url: req.url });
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
// Listen on all network interfaces (0.0.0.0) to allow connections from physical devices
const server = app.listen(Number(PORT), HOST, () => {
  logInfo('Server started', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    accessibleFrom: `http://localhost:${PORT} or http://YOUR_IP:${PORT}`,
    nodeVersion: process.version,
  });
  
  // Signal PM2 that the app is ready (only if running as child process)
  // Wrap in try-catch because process.send() throws when not a child process
  if (process.send) {
    try {
      process.send('ready');
    } catch (error) {
      // Ignore error - process is not a child process (e.g., running with npm start or node)
      // This is expected behavior when not using PM2 cluster mode
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully');
  server.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});

export default app;

