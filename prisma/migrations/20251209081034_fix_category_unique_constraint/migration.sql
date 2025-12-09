-- AlterTable: Fix Category Unique Constraint
-- The database currently has a unique constraint on (name, type) which is incorrect.
-- The schema requires a unique constraint on (userId, name, type) to allow each user
-- to have their own categories with the same names.

-- Step 1: Drop any existing unique constraints that don't include userId
DO $$ 
DECLARE
    constraint_name text;
    constraint_cols text[];
BEGIN
    -- Find and drop unique constraints that don't include userId
    FOR constraint_name IN 
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'categories'
        AND con.contype = 'u'  -- unique constraint
        AND nsp.nspname = 'public'
    LOOP
        -- Get the columns in this constraint
        SELECT array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum))
        INTO constraint_cols
        FROM pg_constraint con2
        JOIN pg_class rel2 ON rel2.oid = con2.conrelid
        JOIN pg_attribute a ON a.attrelid = rel2.oid AND a.attnum = ANY(con2.conkey)
        WHERE con2.conname = constraint_name
        AND rel2.relname = 'categories';
        
        -- Drop if it doesn't include userId
        IF NOT ('userId' = ANY(constraint_cols)) THEN
            EXECUTE format('ALTER TABLE categories DROP CONSTRAINT IF EXISTS %I', constraint_name);
            RAISE NOTICE 'Dropped incorrect constraint: % (columns: %)', constraint_name, array_to_string(constraint_cols, ', ');
        END IF;
    END LOOP;
END $$;

-- Step 2: Ensure the correct unique constraint exists on (userId, name, type)
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

-- Step 3: Ensure index on userId exists for better query performance
CREATE INDEX IF NOT EXISTS "categories_userId_idx" ON "categories"("userId");

