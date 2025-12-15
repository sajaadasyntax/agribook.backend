import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { logInfo, logError, logWarn, logDebug } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import notificationService from './services/notification.service';
import prisma from './config/database';

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
// Default admin origin for admin panel
const ADMIN_ORIGIN = 'https://agriadmin.vercel.app';

// Build allowed origins list
let allowedOrigins: string[] | boolean = true; // Default: allow all
if (corsOrigins && corsOrigins !== '*') {
  allowedOrigins = corsOrigins.split(',').map(origin => origin.trim());
  // Always include admin origin if not already present
  if (!allowedOrigins.includes(ADMIN_ORIGIN)) {
    allowedOrigins.push(ADMIN_ORIGIN);
  }
} else if (corsOrigins === '*') {
  allowedOrigins = true; // Allow all origins
} else {
  // If CORS_ORIGINS is not set, allow admin origin by default
  allowedOrigins = [ADMIN_ORIGIN];
}

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'x-admin-key'],
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

// Serve uploaded files with proper headers for Android compatibility
// In production, consider using UPLOADS_DIR env var for persistent storage
const uploadsPath = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

// Custom middleware to add proper headers for image files
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for image requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Set cache headers
  res.header('Cache-Control', 'public, max-age=86400'); // 1 day
  
  // Determine Content-Type based on file extension
  const url = req.url.toLowerCase();
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
    res.header('Content-Type', 'image/jpeg');
  } else if (url.endsWith('.png')) {
    res.header('Content-Type', 'image/png');
  } else if (url.endsWith('.gif')) {
    res.header('Content-Type', 'image/gif');
  } else if (url.endsWith('.webp')) {
    res.header('Content-Type', 'image/webp');
  }
  
  next();
}, express.static(uploadsPath, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  immutable: false, // Files can be updated
  setHeaders: (res, filePath) => {
    // Ensure Content-Type is set correctly
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  },
}));

// Health check endpoint (with database connectivity check)
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      message: 'AgriBooks API is running',
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    logError('Health check failed: Database connection error', error);
    res.status(503).json({ 
      status: 'error', 
      message: 'AgriBooks API is running but database is not accessible',
      database: 'disconnected',
      timestamp: new Date().toISOString() 
    });
  }
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/settings', settingsRoutes);

// Common bot/scanner patterns to ignore or log at lower level
const BOT_SCAN_PATTERNS = [
  /wp-admin/i,
  /wp-content/i,
  /wp-includes/i,
  /wp-login/i,
  /wordpress/i,
  /\.php$/i,
  /phpmyadmin/i,
  /admin\.php/i,
  /setup-config/i,
  /xmlrpc/i,
  /\.env$/i,
  /\.git/i,
  /\.asp/i,
  /\.aspx/i,
  /cgi-bin/i,
  /shell/i,
  /eval-stdin/i,
];

// 404 handler with smart logging
app.use((req: Request, res: Response) => {
  const url = req.url;
  const isBotScan = BOT_SCAN_PATTERNS.some(pattern => pattern.test(url));
  
  if (isBotScan) {
    // Log bot/scanner traffic at warn level without stack trace
    logWarn('Bot/scanner request blocked', { method: req.method, url, ip: req.ip });
  } else if (url.startsWith('/api/')) {
    // Log missing API routes as warnings (might be client bugs)
    logWarn('API route not found', { method: req.method, url, ip: req.ip });
  } else {
    // Log other 404s at debug level (likely client errors or typos)
    logDebug('Route not found', { method: req.method, url });
  }
  
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Validate database connection before starting server
const validateDatabaseConnection = async (): Promise<void> => {
  try {
    logInfo('Validating database connection...', {});
    await prisma.$connect();
    // Test query to ensure connection is working
    await prisma.$queryRaw`SELECT 1`;
    logInfo('Database connected successfully', {});
  } catch (error) {
    logError('Failed to connect to database', error, {
      message: 'The server cannot start without a database connection. Please check your DATABASE_URL environment variable and ensure PostgreSQL is running.',
    });
    process.exit(1);
  }
};

// Start server with database validation
// Listen on all network interfaces (0.0.0.0) to allow connections from physical devices
const startServer = async (): Promise<void> => {
  // Validate database connection before starting
  await validateDatabaseConnection();

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

  // Start reminder scheduler
  // Check reminders every hour (3600000 ms)
  const REMINDER_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  // Check immediately on startup
  notificationService.checkAllReminders().catch((error) => {
    logError('Error checking reminders on startup', error);
  });

  // Schedule periodic checks
  setInterval(() => {
    notificationService.checkAllReminders().catch((error) => {
      logError('Error checking reminders', error);
    });
  }, REMINDER_CHECK_INTERVAL);

  logInfo('Reminder scheduler started', {
    interval: `${REMINDER_CHECK_INTERVAL / 1000 / 60} minutes`,
  });
  });

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    logInfo('SIGTERM received, shutting down gracefully');
    server.close(async () => {
      logInfo('Disconnecting from database...');
      await prisma.$disconnect();
      logInfo('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logInfo('SIGINT received, shutting down gracefully');
    server.close(async () => {
      logInfo('Disconnecting from database...');
      await prisma.$disconnect();
      logInfo('Process terminated');
      process.exit(0);
    });
  });
};

// Start the server
startServer().catch((error) => {
  logError('Fatal error starting server', error);
  process.exit(1);
});


export default app;

