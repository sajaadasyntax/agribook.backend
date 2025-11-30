// Load .env file for PM2 (compatible with all PM2 versions)
require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'agribook',
      script: 'dist/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        // Environment variables from .env will be inherited
        // Explicitly set critical ones here if needed
        ...(process.env.JWT_SECRET && { JWT_SECRET: process.env.JWT_SECRET }),
        ...(process.env.JWT_REFRESH_SECRET && { JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET }),
        ...(process.env.DATABASE_URL && { DATABASE_URL: process.env.DATABASE_URL }),
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Environment variables from .env will be inherited
        // Explicitly set critical ones here if needed
        ...(process.env.JWT_SECRET && { JWT_SECRET: process.env.JWT_SECRET }),
        ...(process.env.JWT_REFRESH_SECRET && { JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET }),
        ...(process.env.DATABASE_URL && { DATABASE_URL: process.env.DATABASE_URL }),
      },
      // Logging
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

