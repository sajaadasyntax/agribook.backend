# API Usage Guide

This guide shows how the backend API endpoints map to the mobile app features.

## Mobile App Features → API Endpoints

### Home Screen

**Financial Summary Cards:**
```http
GET /api/reports/summary
Headers: x-user-id: <user-id>
```
Returns: `totalIncome`, `totalExpense`, `balance`, `incomeCount`, `expenseCount`

**Monthly Trend Chart:**
```http
GET /api/reports/monthly?year=2024&month=7
Headers: x-user-id: <user-id>
```
Returns: Monthly trend data for charts

**Add Income Button:**
```http
POST /api/transactions
Headers: x-user-id: <user-id>
Body: {
  "type": "INCOME",
  "amount": 1200,
  "categoryId": "<category-id>",
  "description": "Product sales",
  "receiptUrl": "optional-url"
}
```

**Add Expense Button:**
```http
POST /api/transactions
Headers: x-user-id: <user-id>
Body: {
  "type": "EXPENSE",
  "amount": 450,
  "categoryId": "<category-id>",
  "description": "Seed purchase",
  "receiptUrl": "optional-url"
}
```

### Add Screen

**Get Categories:**
```http
GET /api/categories?type=INCOME
GET /api/categories?type=EXPENSE
```

**Save Transaction:**
```http
POST /api/transactions
Headers: x-user-id: <user-id>
Body: {
  "type": "INCOME" | "EXPENSE",
  "amount": 1200,
  "categoryId": "<category-id>",
  "description": "Description",
  "receiptUrl": "optional"
}
```

### Reports Screen

**Daily Report:**
```http
GET /api/reports/daily?date=2024-01-15
Headers: x-user-id: <user-id>
```

**Weekly Report:**
```http
GET /api/reports/weekly?weekStart=2024-01-14
Headers: x-user-id: <user-id>
```

**Monthly Report:**
```http
GET /api/reports/monthly?year=2024&month=1
Headers: x-user-id: <user-id>
```

**Summary Statistics:**
```http
GET /api/reports/statistics
Headers: x-user-id: <user-id>
```
Returns: `totalTransactions`, `averageIncome`, `averageExpense`, `netProfit`

**Export Reports:**
- Use the same endpoints above to fetch data, then format as PDF/Excel on the client side

### Alerts Screen

**Get All Alerts:**
```http
GET /api/alerts
Headers: x-user-id: <user-id>
Query params: ?isRead=false&type=WARNING
```

**Create Alert:**
```http
POST /api/alerts
Headers: x-user-id: <user-id>
Body: {
  "type": "WARNING" | "ERROR" | "INFO" | "SUCCESS",
  "message": "Payment due tomorrow"
}
```

**Mark Alert as Read:**
```http
PATCH /api/alerts/:id/read
Headers: x-user-id: <user-id>
```

**Delete Alert:**
```http
DELETE /api/alerts/:id
Headers: x-user-id: <user-id>
```

### Reminders Screen

**Get All Reminders:**
```http
GET /api/reminders
Headers: x-user-id: <user-id>
Query params: ?completed=false&dueDate=2024-01-31
```

**Create Reminder:**
```http
POST /api/reminders
Headers: x-user-id: <user-id>
Body: {
  "title": "Harvest Season Reminder",
  "description": "Prepare for upcoming harvest season",
  "dueDate": "2024-01-15T00:00:00Z"
}
```

**Toggle Reminder Completion:**
```http
PATCH /api/reminders/:id/toggle
Headers: x-user-id: <user-id>
```

**Update Reminder:**
```http
PUT /api/reminders/:id
Headers: x-user-id: <user-id>
Body: {
  "title": "Updated title",
  "completed": true
}
```

**Delete Reminder:**
```http
DELETE /api/reminders/:id
Headers: x-user-id: <user-id>
```

### Settings Screen

**Get Settings:**
```http
GET /api/settings
Headers: x-user-id: <user-id>
```

**Update Settings:**
```http
PUT /api/settings
Headers: x-user-id: <user-id>
Body: {
  "language": "en" | "ar",
  "darkMode": false,
  "autoBackup": true,
  "offlineMode": true,
  "autoSync": true,
  "pushNotifications": true,
  "emailNotifications": false,
  "expenseThresholdAlert": true,
  "expenseThreshold": 5000,
  "pinEnabled": true,
  "pin": "1234",
  "fingerprintEnabled": false
}
```

**Verify PIN:**
```http
POST /api/settings/verify-pin
Headers: x-user-id: <user-id>
Body: {
  "pin": "1234"
}
```

## Example Usage

### Complete Flow: Creating a User and Adding Transactions

1. **Create/Get User:**
```http
POST /api/users
Body: {
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890"
}
Response: { "user": { "id": "uuid", ... }, "settings": { ... } }
```

2. **Get Categories:**
```http
GET /api/categories?type=INCOME
Response: [
  { "id": "uuid", "name": "Sales", "type": "INCOME", ... },
  ...
]
```

3. **Create Income Transaction:**
```http
POST /api/transactions
Headers: x-user-id: <user-id-from-step-1>
Body: {
  "type": "INCOME",
  "amount": 1200,
  "categoryId": "<sales-category-id>",
  "description": "Product sales for January"
}
```

4. **Get Financial Summary:**
```http
GET /api/reports/summary
Headers: x-user-id: <user-id>
Response: {
  "totalIncome": 1200,
  "totalExpense": 0,
  "balance": 1200,
  ...
}
```

## Authentication

All protected routes require the `x-user-id` header:

```http
Headers: {
  "x-user-id": "user-uuid-here",
  "Content-Type": "application/json"
}
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message here"
}
```

Validation errors:
```json
{
  "errors": [
    {
      "msg": "Amount must be a positive number",
      "param": "amount",
      "location": "body"
    }
  ]
}
```

