# AgriBooks Backend - Ubuntu VPS Deployment Guide

Complete step-by-step guide for deploying AgriBooks backend on Ubuntu VPS with local PostgreSQL database.

## Prerequisites

- Ubuntu 20.04 LTS or later (22.04 LTS recommended)
- Root or sudo access to the VPS
- Domain name (optional, but recommended for production)
- SSH access to your VPS

## Architecture Overview

The deployment uses:
- **PostgreSQL**: Local database server
- **Node.js 20**: Runtime for the application
- **PM2**: Process manager for Node.js
- **Nginx**: Reverse proxy and web server (handles SSL, static files, and routes traffic to the API)

## Architecture Overview

The deployment uses:
- **PostgreSQL**: Local database server
- **Node.js 20**: Runtime for the application
- **PM2**: Process manager for Node.js
- **Nginx**: Reverse proxy and web server (handles SSL, static files, and routes traffic to the API)

---

## Step 1: Initial Server Setup

### 1.1 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Create Application User

```bash
# Create a non-root user for running the application
sudo adduser agribooks
sudo usermod -aG sudo agribooks

# Switch to the new user
su - agribooks
```

### 1.3 Configure Firewall

```bash
# Install UFW (Uncomplicated Firewall)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp   # HTTP (for Nginx)
sudo ufw allow 443/tcp  # HTTPS (for Nginx with SSL)
# Note: Port 3001 is not exposed externally - Nginx reverse proxy handles all traffic
sudo ufw enable
sudo ufw status
```

---

## Step 2: Install PostgreSQL

### 2.1 Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

### 2.2 Start and Enable PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

### 2.3 Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell, run:
CREATE USER agribooks WITH PASSWORD 'agribooks123';
CREATE DATABASE agribooks OWNER agribooks;
GRANT ALL PRIVILEGES ON DATABASE agribooks TO agribooks;

# Exit PostgreSQL
\q
```

### 2.4 Configure PostgreSQL for Local Connections

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Find and set:
```
listen_addresses = 'localhost'
```

```bash
# Edit authentication configuration
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Add this line (if not already present):
```
local   agribooks   agribooks   md5
host    agribooks   agribooks   127.0.0.1/32   md5
```

### 2.5 Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

### 2.6 Test Database Connection

```bash
psql -U agribooks -h localhost -d agribooks
# Enter password when prompted
# Type \q to exit
```

---

## Step 3: Install Node.js

### 3.1 Install Node.js 20 LTS

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x or later
```

### 3.2 Install PM2 Globally

```bash
sudo npm install -g pm2
pm2 -v
```

### 3.3 Setup PM2 Startup Script

```bash
pm2 startup systemd
# Follow the instructions output by the command
# It will show a command like: sudo env PATH=... pm2 startup systemd -u agribooks --hp /home/agribooks
# Copy and run that command
```

---

## Step 4: Deploy Application

### 4.1 Create Application Directory

```bash
sudo mkdir -p /var/www/agribooks
sudo chown -R agribooks:agribooks /var/www/agribooks
cd /var/www/agribooks
```

### 4.2 Clone or Upload Application

**Option A: Clone from Git**
```bash
git clone <your-repo-url> .
```

**Option B: Upload via SCP (from your local machine)**
```bash
# From your local machine
scp -r ./backend/* agribooks@your-server-ip:/var/www/agribooks/
```

### 4.3 Install Dependencies

```bash
cd /var/www/agribooks
# Install ALL dependencies (including dev) - needed for building TypeScript
npm install
```

**Note**: We install all dependencies (including devDependencies) because TypeScript and other build tools are needed to compile the application. After building, the `dist/` folder contains the compiled JavaScript, so dev dependencies are not needed at runtime, but keeping them doesn't hurt.

### 4.4 Create Environment File

```bash
cp .env.example .env
nano .env
```

Update `.env` with your production values:

```env
# Database Configuration
DATABASE_URL="postgresql://agribooks:agribooks123@localhost:5432/agribooks?schema=public"

# JWT Secret - Generate a strong secret
# Run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="your-generated-64-char-secret-here"

# Server Configuration
PORT=3001
NODE_ENV=production
HOST=0.0.0.0

# Logging
LOG_LEVEL=warn

# File Upload Configuration
UPLOAD_DIR="/var/www/agribooks/uploads"
MAX_FILE_SIZE=5242880

# CORS Configuration
# Replace with your actual domain(s)
CORS_ORIGINS=https://getbk.xyz,https://app.getbk.xyz

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4.5 Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and paste it as JWT_SECRET in .env
```

### 4.6 Build Application

```bash
# Build TypeScript to JavaScript
npm run build

# Verify build was successful
ls -la dist/
# You should see compiled .js files in the dist directory
```

### 4.7 (Optional) Remove Dev Dependencies After Build

If you want to save disk space, you can remove dev dependencies after building:

```bash
# Remove dev dependencies (optional)
npm prune --production
```

**Note**: This step is optional. Keeping dev dependencies allows you to rebuild without reinstalling.

### 4.8 Run Database Migrations

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:prod
```

### 4.9 Seed Database (Optional)

```bash
npm run prisma:seed
```

### 4.10 Create Required Directories

```bash
mkdir -p uploads logs
chmod 755 uploads logs
```

---

## Step 5: Configure PM2

### 5.1 Start Application with PM2

```bash
cd /var/www/agribooks
pm2 start ecosystem.config.js --env production
```

### 5.2 Verify Application is Running

```bash
pm2 status
pm2 logs agribooks-api
```

### 5.3 Save PM2 Configuration

```bash
pm2 save
```

### 5.4 Useful PM2 Commands

```bash
pm2 restart agribooks-api    # Restart app
pm2 stop agribooks-api       # Stop app
pm2 delete agribooks-api     # Remove from PM2
pm2 logs agribooks-api       # View logs
pm2 monit                    # Monitor dashboard
pm2 reload agribooks-api     # Zero-downtime reload
```

---

## Step 6: Install and Configure Nginx

Nginx will act as a reverse proxy, handling:
- SSL/HTTPS termination
- Routing requests to the Node.js API
- Serving static files (uploads)
- Load balancing (if needed in the future)

### 6.1 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 6.2 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/agribooks
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name getbk.xyz;  # Replace with your domain or IP

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For now, proxy to API (remove after SSL setup)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Serve uploaded files
    location /uploads {
        alias /var/www/agribooks/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://127.0.0.1:3001/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

### 6.3 Remove Default Nginx Site (Optional)

```bash
# Remove the default Nginx site if you don't need it
sudo rm /etc/nginx/sites-enabled/default
```

### 6.4 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/agribooks /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 6.5 Verify Nginx is Working

```bash
# Test from server
curl http://getbk.xyz/api/health

# Test from your local machine (replace with your server IP or domain)
curl http://your-server-ip/api/health
```

---

## Step 7: Setup SSL/HTTPS (Recommended)

### 7.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d getbk.xyz
# Follow the prompts
# Enter your email address
# Agree to terms
# Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### 7.3 Update Nginx Configuration for HTTPS

After Certbot runs, it will automatically update your Nginx config. The HTTP server block will redirect to HTTPS.

### 7.4 Test Auto-renewal

```bash
sudo certbot renew --dry-run
```

Certbot will automatically renew certificates. You can verify this with:

```bash
sudo systemctl status certbot.timer
```

---

## Step 8: Verify Deployment

### 8.1 Test API Health Endpoint

```bash
# From server
curl http://localhost:3001/api/health

# From your local machine (replace with your domain/IP)
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "AgriBooks API is running",
  "timestamp": "2024-..."
}
```

### 8.2 Check Application Logs

```bash
pm2 logs agribooks-api --lines 50
```

### 8.3 Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Step 9: Database Backup Setup

### 9.1 Create Backup Script

```bash
sudo nano /usr/local/bin/backup-agribooks.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/agribooks"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U agribooks -h localhost agribooks > $BACKUP_DIR/agribooks_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/agribooks_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: agribooks_$DATE.sql.gz"
```

### 9.2 Make Script Executable

```bash
sudo chmod +x /usr/local/bin/backup-agribooks.sh
```

### 9.3 Setup Cron Job for Daily Backups

```bash
sudo crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/backup-agribooks.sh >> /var/log/agribooks-backup.log 2>&1
```

This runs daily at 2 AM.

---

## Step 10: Monitoring and Maintenance

### 10.1 View Application Logs

```bash
# PM2 logs
pm2 logs agribooks-api

# Application logs
tail -f /var/www/agribooks/logs/*.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 10.2 Monitor System Resources

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('agribooks'));"
```

### 10.3 Update Application

```bash
cd /var/www/agribooks

# Pull latest changes (if using git)
git pull

# Install dependencies (including dev for building)
npm install

# Build
npm run build

# Run migrations (if any)
npm run prisma:migrate:prod

# Restart application
pm2 restart agribooks-api
```

---

## Step 11: Troubleshooting

### Application Won't Start

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs agribooks-api --lines 100

# Check if port is in use
sudo lsof -i :3001

# Check Node.js version
node -v
```

### Database Connection Issues

```bash
# Test connection
psql -U agribooks -h localhost -d agribooks

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Nginx 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check Nginx config
sudo nginx -t

# Restart services
pm2 restart agribooks-api
sudo systemctl restart nginx
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R agribooks:agribooks /var/www/agribooks

# Fix upload directory permissions
chmod 755 /var/www/agribooks/uploads
```

---

## Step 12: Security Hardening

### 12.1 Secure PostgreSQL

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Set:
max_connections = 100
shared_buffers = 256MB
```

### 12.2 Setup Fail2Ban (Optional)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 12.3 Regular Security Updates

```bash
# Setup automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Quick Reference Commands

```bash
# Start/Stop/Restart Application
pm2 start ecosystem.config.js --env production
pm2 stop agribooks-api
pm2 restart agribooks-api

# View Logs
pm2 logs agribooks-api
tail -f /var/www/agribooks/logs/*.log

# Database Backup
pg_dump -U agribooks -h localhost agribooks > backup.sql

# Database Restore
psql -U agribooks -h localhost agribooks < backup.sql

# Check Services
sudo systemctl status postgresql
sudo systemctl status nginx
pm2 status

# Nginx Commands
sudo systemctl restart nginx      # Restart Nginx
sudo nginx -t                     # Test Nginx configuration
sudo systemctl reload nginx       # Reload Nginx (no downtime)
sudo tail -f /var/log/nginx/access.log   # View access logs
sudo tail -f /var/log/nginx/error.log    # View error logs

# Update Application
cd /var/www/agribooks
git pull
npm install  # Install all dependencies (needed for building)
npm run build
npm run prisma:migrate:prod
pm2 restart agribooks-api
```

---

## Deployment Checklist

- [ ] Server updated and secured
- [ ] PostgreSQL installed and configured
- [ ] Database and user created
- [ ] Node.js 20+ installed
- [ ] PM2 installed and configured
- [ ] Application deployed to `/var/www/agribooks`
- [ ] Environment variables configured in `.env`
- [ ] JWT secret generated and set
- [ ] Application built (`npm run build`)
- [ ] Database migrations run
- [ ] Application running with PM2
- [ ] Nginx installed and enabled
- [ ] Nginx configured as reverse proxy
- [ ] Nginx configuration tested (`sudo nginx -t`)
- [ ] Nginx serving API through reverse proxy
- [ ] SSL certificate installed (if using domain)
- [ ] Firewall configured
- [ ] Backup script setup
- [ ] Health check endpoint working
- [ ] Logs accessible and monitored

---

## Support

For issues or questions:
- Check application logs: `pm2 logs agribooks-api`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`

