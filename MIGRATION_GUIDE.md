# Reminder System Migration Guide

This guide explains how to apply the database migration for the new reminder system features.

## Changes Made

The Reminder model has been updated to include:
- `reminderType` (enum: GENERAL, TRANSACTION, THRESHOLD)
- `categoryId` (optional foreign key to Category)
- `thresholdAmount` (optional Decimal)
- `transactionType` (optional enum: INCOME, EXPENSE)
- `transactionAmount` (optional Decimal)

## Migration Steps

### 1. Generate Prisma Client

```bash
cd backend
npm run prisma:generate
```

### 2. Create and Apply Migration

```bash
# Create a new migration
npx prisma migrate dev --name add_reminder_fields

# Or if you want to apply to production
npx prisma migrate deploy
```

### 3. Verify Migration

After migration, verify the changes:

```bash
# Open Prisma Studio to inspect the database
npm run prisma:studio
```

## New Features

### Threshold Reminders
- Automatically trigger when an expense transaction exceeds the threshold amount for a specific category
- Integrated into transaction creation and update flows

### Transaction Reminders
- Trigger when the due date arrives
- Checked hourly via scheduled job

### General Reminders
- Trigger on the due date
- Checked hourly via scheduled job

## Notification Service

The notification service (`src/services/notification.service.ts`) automatically:
- Checks threshold reminders when expenses are created/updated
- Checks transaction and general reminders every hour
- Creates alerts for triggered reminders

## Testing

1. Create a threshold reminder:
   - Set reminder type to "THRESHOLD"
   - Select a category
   - Set a threshold amount
   - Create an expense transaction that exceeds the threshold
   - Check alerts - you should see a warning alert

2. Create a transaction reminder:
   - Set reminder type to "TRANSACTION"
   - Set a due date (today or in the future)
   - Wait for the scheduled check (or trigger manually)
   - Check alerts - you should see an info alert

3. Create a general reminder:
   - Set reminder type to "GENERAL"
   - Set a due date
   - Wait for the scheduled check
   - Check alerts - you should see an info alert

