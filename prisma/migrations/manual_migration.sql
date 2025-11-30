-- Migration: Add authentication and phone unique constraint
-- Run this SQL directly on your production database

-- Step 1: Add password column to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "password" TEXT;
    END IF;
END $$;

-- Step 2: Add unique constraint on phone (if not exists)
-- First, check if there are duplicate phone numbers
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT phone, COUNT(*) 
        FROM users 
        WHERE phone IS NOT NULL 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot add unique constraint: Found % duplicate phone numbers. Please resolve duplicates first.', duplicate_count;
    END IF;
END $$;

-- Add unique constraint on phone
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_phone_key'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");
    END IF;
END $$;

-- Step 3: Create refresh_tokens table (if not exists)
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add unique constraint on token
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'refresh_tokens_token_key'
    ) THEN
        ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_token_key" UNIQUE ("token");
    END IF;
END $$;

-- Step 5: Create indexes on refresh_tokens
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- Step 6: Add foreign key constraint (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'refresh_tokens_userId_fkey'
    ) THEN
        ALTER TABLE "refresh_tokens" 
        ADD CONSTRAINT "refresh_tokens_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Verification queries (run these to verify the migration)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password';
-- SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_type = 'UNIQUE';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'refresh_tokens';

