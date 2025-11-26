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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
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
const server = app.listen(PORT, '0.0.0.0', () => {
  logInfo('Server started', {
    port: PORT,
    host: '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    accessibleFrom: `http://localhost:${PORT} or http://YOUR_IP:${PORT}`,
  });
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

