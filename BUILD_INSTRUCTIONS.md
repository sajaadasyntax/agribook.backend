# Build Instructions

## Important: Prisma Client Must Be Generated First

Before running `npm run build`, you **must** regenerate the Prisma Client with the updated schema.

## Steps to Build

1. **First, apply the database migration** (choose one method):

   **Option A: Using `prisma db push` (Quick)**
   ```bash
   npx prisma db push
   ```

   **Option B: Using manual SQL** (Recommended for production)
   ```bash
   psql $DATABASE_URL -f prisma/migrations/manual_migration.sql
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Then build:**
   ```bash
   npm run build
   ```

## Why This Order Matters

The TypeScript compiler needs the generated Prisma Client types to compile successfully. If you try to build before generating the client, you'll get errors like:
- `Property 'refreshToken' does not exist on type 'PrismaClient'`
- `Property 'password' does not exist on type 'User'`
- `Property 'logoUrl' does not exist on type 'User'`

These errors occur because TypeScript is using the old Prisma Client types that don't include the new fields from your schema.

## Complete Build Sequence

```bash
# 1. Apply database changes
npx prisma db push
# OR
psql $DATABASE_URL -f prisma/migrations/manual_migration.sql

# 2. Generate Prisma Client
npx prisma generate

# 3. Build TypeScript
npm run build

# 4. Start server
npm start
```

