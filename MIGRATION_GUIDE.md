# Database Migration Guide

## Problem
Prisma `migrate dev` requires a shadow database, which your production database user doesn't have permission to create.

## Solution Options

### Option 1: Use `prisma migrate deploy` (Recommended for Production)

This command doesn't require a shadow database and is designed for production environments.

**Steps:**

1. **On your local machine (with dev database access):**
```bash
cd backend
npx prisma migrate dev --name add_auth_and_phone_unique --create-only
```

This creates the migration file without applying it.

2. **Copy the migration file to your server:**
   - Copy the generated migration file from `prisma/migrations/` to your server

3. **On your production server:**
```bash
cd /var/www/agribooks/agribook.backend
npx prisma generate
npx prisma migrate deploy
```

### Option 2: Use `prisma db push` (Quick Workaround)

This pushes schema changes directly without creating migration files. **Use with caution in production.**

```bash
cd /var/www/agribooks/agribook.backend
npx prisma generate
npx prisma db push
```

**Warning:** `db push` doesn't create migration history and may cause issues if you need to rollback.

### Option 3: Grant Database Permissions

If you have superuser access, grant the database user permission to create databases:

```sql
-- Connect as postgres superuser
ALTER USER your_db_user CREATEDB;
```

Then you can use `prisma migrate dev` normally.

### Option 4: Configure Shadow Database URL

You can specify a separate shadow database in your `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agribooks"
SHADOW_DATABASE_URL="postgresql://user:password@localhost:5432/agribooks_shadow"
```

Then create the shadow database manually:
```sql
CREATE DATABASE agribooks_shadow;
```

---

## Recommended Approach for Your Situation

Since you're on a production server, I recommend **Option 1**:

1. Create the migration locally
2. Copy it to the server
3. Run `prisma migrate deploy` on the server

This is the safest approach for production environments.
