-- AlterTable: Fix Category Unique Constraint
-- The database currently has a unique constraint on (name, type) which is incorrect.
-- The schema requires a unique constraint on (userId, name, type) to allow each user
-- to have their own categories with the same names.

-- Step 1: Drop the incorrect unique constraint on (name, type) if it exists
-- Common constraint names that might exist:
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_type_key";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_key";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_type_key";

-- Step 2: Drop any other unique constraints that don't include userId
-- This handles any custom constraint names
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'categories'
        AND con.contype = 'u'  -- unique constraint
        AND nsp.nspname = 'public'
        AND con.conname != 'categories_userId_name_type_key'  -- Don't drop the correct one
    LOOP
        -- Check if this constraint includes userId by checking if any of its columns is userId
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint con2
            JOIN pg_class rel2 ON rel2.oid = con2.conrelid
            JOIN pg_attribute a ON a.attrelid = rel2.oid AND a.attnum = ANY(con2.conkey)
            WHERE con2.conname = constraint_record.conname
            AND rel2.relname = 'categories'
            AND a.attname = 'userId'
        ) THEN
            EXECUTE format('ALTER TABLE categories DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
            RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
        END IF;
    END LOOP;
END $$;

-- Step 3: Ensure the correct unique constraint exists on (userId, name, type)
-- This allows each user to have their own categories with the same names
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_userId_name_type_key'
        AND conrelid = 'categories'::regclass
    ) THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_name_type_key" UNIQUE ("userId", "name", "type");
        RAISE NOTICE 'Created correct unique constraint: categories_userId_name_type_key';
    ELSE
        RAISE NOTICE 'Correct unique constraint already exists: categories_userId_name_type_key';
    END IF;
END $$;

-- Step 4: Ensure index on userId exists for better query performance
CREATE INDEX IF NOT EXISTS "categories_userId_idx" ON "categories"("userId");

