# Bug Fix: Invalid ReminderType "BUDGET_ALERT"

## Problem

The backend was receiving `reminderType: "BUDGET_ALERT"` from the frontend, but the Prisma schema only defines:
- `GENERAL`
- `TRANSACTION`
- `THRESHOLD`

This caused Prisma validation errors:
```
Invalid value for argument `reminderType`. Expected ReminderType.
```

## Root Cause

The frontend (mobile app) was sending `"BUDGET_ALERT"` as the `reminderType`, which doesn't exist in the database enum. This could be:
1. Old cached code in the mobile app
2. A legacy value that was used before the enum was standardized
3. A mismatch between frontend and backend versions

## Solution

Added validation and backward compatibility mapping in `backend/src/services/reminder.service.ts`:

### 1. Backward Compatibility Mapping
- `"BUDGET_ALERT"` is automatically mapped to `"THRESHOLD"`
- This allows old clients to continue working without breaking

### 2. Validation
- Invalid `reminderType` values are rejected with a clear error message
- Returns `400 Bad Request` with a descriptive error

### 3. Logging
- Logs when legacy values are mapped for debugging
- Helps track if old clients are still in use

## Changes Made

### `backend/src/services/reminder.service.ts`

**In `createReminder()` method:**
- Added validation and normalization of `reminderType`
- Maps `"BUDGET_ALERT"` → `"THRESHOLD"`
- Validates against allowed values: `['GENERAL', 'TRANSACTION', 'THRESHOLD']`
- Throws `BadRequestError` for invalid values

**In `updateReminder()` method:**
- Same validation and mapping logic
- Ensures updates also handle legacy values

## Testing

After deploying, test with:

1. **Valid values** should work:
   - `GENERAL`
   - `TRANSACTION`
   - `THRESHOLD`

2. **Legacy value** should be mapped:
   - `BUDGET_ALERT` → automatically becomes `THRESHOLD`

3. **Invalid values** should return 400:
   - Any other value → `400 Bad Request` with error message

## Deployment

1. Deploy the updated `reminder.service.ts` to production
2. Restart the backend server
3. Monitor logs for any `BUDGET_ALERT` mappings (indicates old clients)
4. Consider updating mobile app to remove any `BUDGET_ALERT` usage

## Future Recommendations

1. **Update Mobile App**: Ensure mobile app only sends valid enum values
2. **API Versioning**: Consider API versioning to handle breaking changes
3. **Deprecation**: After confirming no clients use `BUDGET_ALERT`, remove the mapping

