# AgriBooks Backend - Ubuntu Deployment Guide

## Prerequisites

- Ubuntu 20.04 LTS or later
- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- PM2 (Process Manager)
- Nginx (Reverse Proxy)

---

## 1. Server Setup

### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js 18 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Verify installation
```

### Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Install PM2 Globally
```bash
sudo npm install -g pm2
```

### Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 2. Database Setup

### Create Database and User
```bash
sudo -u postgres psql

# In PostgreSQL shell:
CREATE USER agribooks WITH PASSWORD 'your_secure_password';
CREATE DATABASE agribooks OWNER agribooks;
GRANT ALL PRIVILEGES ON DATABASE agribooks TO agribooks;
\q
```

### Allow Remote Connections (if needed)
Edit `/etc/postgresql/14/main/postgresql.conf`:
```
listen_addresses = 'localhost'  # Or '*' for remote connections
```

Edit `/etc/postgresql/14/main/pg_hba.conf`:
```
# Add this line for local connections
local   agribooks   agribooks   md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 3. Application Deployment

### Create App Directory
```bash
sudo mkdir -p /var/www/agribooks
sudo chown -R $USER:$USER /var/www/agribooks
```

### Clone or Upload Application
```bash
cd /var/www/agribooks
# Option 1: Clone from git
git clone <your-repo-url> .

# Option 2: Upload via SCP (from local machine)
scp -r ./backend/* user@your-server:/var/www/agribooks/
```

### Install Dependencies
```bash
cd /var/www/agribooks
npm install --production
```

### Create Environment File
```bash
cp .env.example .env
nano .env
```

Update `.env` with production values:
```env
# Database Configuration
DATABASE_URL="postgresql://agribooks:your_secure_password@localhost:5432/agribooks?schema=public"

# JWT Secret (generate a strong secret)
JWT_SECRET="generate-a-64-char-random-string-here"

# Server Configuration
PORT=3001
NODE_ENV=production

# Logging
LOG_LEVEL=warn

# File Upload Configuration
UPLOAD_DIR="/var/www/agribooks/uploads"
MAX_FILE_SIZE=5242880
```

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Build Application
```bash
npm run build
```

### Run Database Migrations
```bash
npm run prisma:generate
npm run prisma:migrate:prod
```

### Seed Database (Optional)
```bash
npm run prisma:seed
```

### Create Uploads Directory
```bash
mkdir -p uploads logs
chmod 755 uploads logs
```

---

## 4. Process Management with PM2

### Start Application
```bash
pm2 start ecosystem.config.js --env production
```

### Verify Running
```bash
pm2 status
pm2 logs agribooks-api
```

### Setup PM2 Startup Script
```bash
pm2 startup systemd
# Follow the instructions output by the command
pm2 save
```

### Useful PM2 Commands
```bash
pm2 restart agribooks-api    # Restart app
pm2 stop agribooks-api       # Stop app
pm2 delete agribooks-api     # Remove from PM2
pm2 logs agribooks-api       # View logs
pm2 monit                    # Monitor dashboard
```

---

## 5. Nginx Reverse Proxy

### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/agribooks
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your server IP

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
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/agribooks /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## 6. SSL/HTTPS with Let's Encrypt (Optional but Recommended)

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

### Auto-renewal Test
```bash
sudo certbot renew --dry-run
```

---

## 7. Firewall Configuration

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 8. Systemd Service (Alternative to PM2)

If you prefer systemd over PM2, create a service file:

```bash
sudo nano /etc/systemd/system/agribooks.service
```

```ini
[Unit]
Description=AgriBooks API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/agribooks
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=agribooks

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable agribooks
sudo systemctl start agribooks
sudo systemctl status agribooks
```

---

## 9. Monitoring & Maintenance

### View Application Logs
```bash
# PM2 logs
pm2 logs agribooks-api

# Application logs
tail -f /var/www/agribooks/logs/*.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Create backup
pg_dump -U agribooks -h localhost agribooks > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U agribooks -h localhost agribooks < backup_20231201.sql
```

### Update Application
```bash
cd /var/www/agribooks
git pull  # Or upload new files
npm install --production
npm run build
npm run prisma:migrate:prod
pm2 restart agribooks-api
```

---

## 10. Health Check

Test the API is running:
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","message":"AgriBooks API is running","timestamp":"..."}
```

---

## Troubleshooting

### Application Won't Start
```bash
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
```

### Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/agribooks

# Fix upload directory permissions
chmod 755 /var/www/agribooks/uploads
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

---

## Quick Deploy Script

Save this as `deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying AgriBooks API..."

cd /var/www/agribooks

echo "📥 Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
npm install --production

echo "🔨 Building application..."
npm run build

echo "🗃️ Running migrations..."
npm run prisma:migrate:prod

echo "🔄 Restarting application..."
pm2 restart agribooks-api

echo "✅ Deployment complete!"
pm2 status
```

Make executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

