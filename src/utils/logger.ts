import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = path.join(__dirname, '../../logs');

// JSON format for file logs (machine readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Clean, readable format for console/PM2 logs
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Remove service from meta for cleaner output
    const { service, ...cleanMeta } = meta;
    
    // Format metadata concisely
    let metaStr = '';
    if (Object.keys(cleanMeta).length > 0) {
      // For errors, only show error message not full stack
      if (cleanMeta.error && cleanMeta.stack) {
        metaStr = ` | ${cleanMeta.error}`;
      } else if (cleanMeta.method && cleanMeta.url) {
        // HTTP-style log
        metaStr = ` | ${cleanMeta.method} ${cleanMeta.url}`;
        if (cleanMeta.statusCode) metaStr += ` → ${cleanMeta.statusCode}`;
        if (cleanMeta.responseTime) metaStr += ` (${cleanMeta.responseTime})`;
      } else {
        // Other metadata - compact JSON
        const compactMeta = Object.entries(cleanMeta)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' ');
        if (compactMeta) metaStr = ` | ${compactMeta}`;
      }
    }
    
    // Level indicators: ✓ info, ⚠ warn, ✗ error, • debug
    const levelIcons: Record<string, string> = {
      info: '✓',
      warn: '⚠',
      error: '✗',
      debug: '•',
    };
    const icon = levelIcons[level] || '○';
    
    return `${timestamp} ${icon} ${message}${metaStr}`;
  })
);

// Colorized console format for local development
const devConsoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const { service, ...cleanMeta } = meta;
    const metaString = Object.keys(cleanMeta).length ? ` ${JSON.stringify(cleanMeta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// Determine if running in development
const isDev = process.env.NODE_ENV !== 'production';

// Create transports
const transports: winston.transport[] = [
  // Console transport - clean format for PM2, colorized for dev
  new winston.transports.Console({
    format: isDev ? devConsoleFormat : consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  }),
];

// Add file transports in production
if (!isDev) {
  // Error log file (JSON format for parsing)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
    })
  );

  // Combined log file (JSON format for parsing)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'agribooks-api' },
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log'), format: fileFormat }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log'), format: fileFormat }),
  ],
});

// Helper methods for structured logging
export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | unknown, meta?: Record<string, unknown>): void => {
  if (error instanceof Error) {
    logger.error(message, { ...meta, error: error.message, stack: error.stack });
  } else {
    logger.error(message, { ...meta, error });
  }
};

export const logWarn = (message: string, meta?: Record<string, unknown>): void => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  logger.debug(message, meta);
};

export const logHttp = (req: { method: string; url: string; ip?: string }, res: { statusCode: number }, responseTime: number): void => {
  // Skip logging for health checks to reduce noise
  if (req.url === '/api/health') return;
  
  // Determine log level based on status code
  const statusCode = res.statusCode;
  const logData = {
    method: req.method,
    url: req.url,
    statusCode,
    responseTime: `${responseTime}ms`,
  };
  
  if (statusCode >= 500) {
    logger.error('HTTP Request', logData);
  } else if (statusCode >= 400) {
    // Don't log 404s here (handled by 404 middleware)
    if (statusCode !== 404) {
      logger.warn('HTTP Request', logData);
    }
  } else {
    logger.info('HTTP Request', logData);
  }
};

export default logger;

