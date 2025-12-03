#!/bin/bash

# Script to resolve failed migration 20241201000000_enhance_reminders_system
# This migration was a duplicate of 20251129223615_add_reminder_fields

set -e  # Exit on error

echo "🔧 Resolving failed migration: 20241201000000_enhance_reminders_system"
echo ""

# Check if we're in the backend directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Must run from backend directory"
    echo "   cd backend && bash scripts/resolve-failed-migration.sh"
    exit 1
fi

# Step 1: Check database connection
echo "📡 Checking database connection..."
if ! npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to database"
    echo "   Please check your DATABASE_URL environment variable"
    exit 1
fi
echo "✅ Database connection OK"
echo ""

# Step 2: Check if ReminderType enum exists
echo "🔍 Checking database state..."
ENUM_EXISTS=$(psql $DATABASE_URL -tAc "SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'ReminderType')" 2>/dev/null || echo "false")

if [ "$ENUM_EXISTS" = "t" ]; then
    echo "✅ ReminderType enum exists"
else
    echo "⚠️  ReminderType enum does NOT exist"
fi

# Step 3: Check if reminder columns exist
COLUMNS_EXIST=$(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'reminders' AND column_name IN ('categoryId', 'reminderType', 'thresholdAmount', 'transactionAmount', 'transactionType')" 2>/dev/null || echo "0")

if [ "$COLUMNS_EXIST" = "5" ]; then
    echo "✅ All reminder columns exist"
elif [ "$COLUMNS_EXIST" -gt "0" ]; then
    echo "⚠️  Some reminder columns exist ($COLUMNS_EXIST/5)"
else
    echo "⚠️  No reminder columns exist"
fi
echo ""

# Step 4: Mark migration as rolled back
echo "📝 Marking failed migration as rolled back..."
if npx prisma migrate resolve --rolled-back 20241201000000_enhance_reminders_system; then
    echo "✅ Successfully marked migration as rolled back"
else
    echo "❌ Failed to mark migration as rolled back"
    echo "   You may need to manually resolve this:"
    echo "   npx prisma migrate resolve --rolled-back 20241201000000_enhance_reminders_system"
    exit 1
fi
echo ""

# Step 5: Verify migration status
echo "🔍 Verifying migration status..."
npx prisma migrate status
echo ""

# Step 6: Attempt to deploy remaining migrations
echo "🚀 Attempting to deploy remaining migrations..."
if npx prisma migrate deploy; then
    echo ""
    echo "✅ All migrations deployed successfully!"
else
    echo ""
    echo "⚠️  Some migrations may still need attention"
    echo "   Check the output above for details"
    exit 1
fi

echo ""
echo "✨ Resolution complete!"

