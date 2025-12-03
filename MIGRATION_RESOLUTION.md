# Migration Resolution Guide

## Problem: Failed Migration Blocking New Migrations

The migration `20241201000000_enhance_reminders_system` was attempted in production but failed, blocking all new migrations with error:

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20241201000000_enhance_reminders_system` migration started at 2025-12-03 15:54:43.222544 UTC failed
```

## Root Cause

The migration `20241201000000_enhance_reminders_system` was identical to `20251129223615_add_reminder_fields`. When it ran, it likely tried to create objects that already existed (like the `ReminderType` enum or columns), causing it to fail partway through.

## Solution: Mark Migration as Rolled Back

Since the duplicate migration was removed from the codebase and the correct migration (`20251129223615_add_reminder_fields`) should already have the correct state, we need to mark the failed migration as rolled back.

### Step 1: Connect to Production Server

```bash
ssh root@srv1152286
cd /var/www/agribooks/agribook.backend
```

### Step 2: Mark Failed Migration as Rolled Back

```bash
npx prisma migrate resolve --rolled-back 20241201000000_enhance_reminders_system
```

This tells Prisma that the migration was rolled back and should be skipped.

### Step 3: Verify Database State

Check if the ReminderType enum and columns exist:

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Check if ReminderType enum exists
SELECT typname FROM pg_type WHERE typname = 'ReminderType';

# Check if reminder columns exist
\d reminders

# Exit psql
\q
```

### Step 4: If Database State is Correct

If the enum and columns already exist (from the successful `20251129223615_add_reminder_fields` migration), you're done. Continue with:

```bash
npx prisma migrate deploy
```

### Step 5: If Database State is Incomplete

If the migration partially applied and some objects are missing, you may need to manually fix the database state to match what `20251129223615_add_reminder_fields` should have created.

**Check what exists:**
```sql
-- Check enum
SELECT typname FROM pg_type WHERE typname = 'ReminderType';

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reminders' 
AND column_name IN ('categoryId', 'reminderType', 'thresholdAmount', 'transactionAmount', 'transactionType');

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'reminders' AND indexname LIKE '%reminder%';
```

**If missing, apply the correct migration manually:**
```bash
psql $DATABASE_URL -f prisma/migrations/20251129223615_add_reminder_fields/migration.sql
```

Then mark the failed migration as rolled back:
```bash
npx prisma migrate resolve --rolled-back 20241201000000_enhance_reminders_system
```

## Alternative: Force Remove Failed Migration (If Safe)

If you're certain the database state is correct and matches the schema, you can manually remove the failed migration record from Prisma's migration table:

```sql
-- Connect to database
psql $DATABASE_URL

-- Remove the failed migration record
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20241201000000_enhance_reminders_system';

-- Verify it's gone
SELECT migration_name, finished_at, applied_steps_count 
FROM "_prisma_migrations" 
ORDER BY started_at;
```

**⚠️ WARNING:** Only do this if you're certain the database state is correct!

## Prevention

To prevent this in the future:

1. **Never manually create migration files** - Always use `prisma migrate dev --create-only`
2. **Verify migrations before deploying** - Check that migration files don't duplicate existing changes
3. **Use migration timestamps correctly** - Prisma generates timestamps automatically

## Quick Resolution Script

For convenience, use the provided script:

```bash
bash scripts/resolve-failed-migration.sh
```

