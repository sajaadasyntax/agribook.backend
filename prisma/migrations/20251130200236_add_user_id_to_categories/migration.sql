-- Step 1: Add userId column as nullable first
ALTER TABLE "categories" ADD COLUMN "userId" TEXT;

-- Step 2: Assign existing categories to the first user (or a default user)
-- If no users exist, we'll need to handle this case
UPDATE "categories" 
SET "userId" = (SELECT "id" FROM "users" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL;

-- Step 3: If there are categories but no users, delete the categories
-- (This handles the edge case where categories exist but no users)
DELETE FROM "categories" WHERE "userId" IS NULL;

-- Step 4: Drop the old unique constraint
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_type_key";

-- Step 5: Make userId NOT NULL
ALTER TABLE "categories" ALTER COLUMN "userId" SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Add the new unique constraint with userId
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_name_type_key" UNIQUE ("userId", "name", "type");

-- Step 8: Add index on userId for better query performance
CREATE INDEX "categories_userId_idx" ON "categories"("userId");

