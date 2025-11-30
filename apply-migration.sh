#!/bin/bash

# Migration script for production server
# This script applies the manual migration and generates Prisma client

set -e  # Exit on error

echo "🚀 Starting migration process..."

# Step 1: Apply the SQL migration
echo "📝 Applying database migration..."
if command -v psql &> /dev/null; then
    # If psql is available, use it
    psql $DATABASE_URL -f prisma/migrations/manual_migration.sql
else
    echo "⚠️  psql not found. Please run the SQL manually:"
    echo "   cat prisma/migrations/manual_migration.sql | psql \$DATABASE_URL"
    echo ""
    echo "Or connect to your database and run the SQL file contents."
    exit 1
fi

# Step 2: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Step 3: Verify migration
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Test authentication endpoints"
echo "3. Verify refresh tokens are being created"

