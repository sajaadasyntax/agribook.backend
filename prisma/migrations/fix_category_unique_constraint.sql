-- Fix Category Unique Constraint
-- The constraint should be on (userId, name, type), not just (name, type)
-- This allows each user to have their own set of categories

-- Step 1: Drop the incorrect constraint (name, type)
-- Find and drop any existing unique constraints on categories table
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find constraints that include 'name' and 'type' but NOT 'userId'
    FOR constraint_name IN 
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'categories'
        AND con.contype = 'u'  -- unique constraint
        AND nsp.nspname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE categories DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Create the correct unique constraint on (userId, name, type)
-- This allows each user to have their own categories with the same names
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_userId_name_type_key'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT "categories_userId_name_type_key" UNIQUE ("userId", "name", "type");
        RAISE NOTICE 'Created correct unique constraint: categories_userId_name_type_key';
    END IF;
END $$;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS "categories_userId_idx" ON categories("userId");

-- Verify the constraint was created correctly
DO $$
DECLARE
    constraint_cols text;
BEGIN
    SELECT string_agg(a.attname, ', ' ORDER BY array_position(con.conkey, a.attnum))
    INTO constraint_cols
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = ANY(con.conkey)
    WHERE rel.relname = 'categories'
    AND con.conname = 'categories_userId_name_type_key';
    
    IF constraint_cols IS NOT NULL THEN
        RAISE NOTICE 'Verified constraint columns: %', constraint_cols;
    ELSE
        RAISE WARNING 'Constraint not found! Manual intervention may be needed.';
    END IF;
END $$;

