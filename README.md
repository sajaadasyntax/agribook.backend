# AgriBooks Backend API

TypeScript backend API for the AgriBooks mobile application, built with Express, Prisma, and PostgreSQL.

## Features

- **TypeScript**: Full type safety and modern JavaScript features
- **Layered Architecture**: Controllers, Services, and Routes separation
- **Comprehensive Logging**: Winston-based logging with file rotation
- **Error Handling**: Centralized error handling with custom error classes
- **Request Validation**: Input validation using express-validator
- **User Management**: Create and manage users
- **Transaction Management**: Full CRUD operations for income and expense transactions
- **Category Management**: Predefined categories for income and expenses
- **Reports & Analytics**: Daily, weekly, and monthly financial reports with statistics
- **Alerts System**: Create and manage alerts (warnings, errors, info, success)
- **Reminders**: Task reminders with due dates
- **Settings**: User preferences including language, security (PIN/biometric), and notifications

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Prisma** - ORM for database management
- **PostgreSQL** - Database
- **Winston** - Logging library
- **bcryptjs** - Password hashing for PIN
- **express-validator** - Request validation

## Architecture

The project follows a clean layered architecture:

```
src/
├── config/          # Configuration files (database, etc.)
├── controllers/     # Request handlers (HTTP layer)
├── services/        # Business logic layer
├── routes/          # Route definitions
├── middleware/      # Custom middleware (auth, validation, error handling, logging)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions (logger, errors)
└── server.ts        # Application entry point
```

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn
- TypeScript (installed as dev dependency)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/agribooks?schema=public"
   JWT_SECRET="your-secret-key-change-this-in-production"
   PORT=3001
   NODE_ENV=development
   LOG_LEVEL=info
   UPLOAD_DIR="./uploads"
   MAX_FILE_SIZE=5242880
   ```

3. **Set up the database:**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate

   # Run migrations
   npm run prisma:migrate

   # Seed the database with default categories
   npm run prisma:seed
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript
- `npm run dev` - Run in development mode with auto-reload
- `npm run type-check` - Type check without emitting files
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed the database

## API Endpoints

### Health Check
- `GET /api/health` - Check API status

### Users
- `POST /api/users` - Create or get user
- `GET /api/users/:id` - Get user by ID

### Transactions
- `GET /api/transactions` - Get all transactions (with filters: type, categoryId, startDate, endDate)
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Categories
- `GET /api/categories` - Get all categories (optional filter: type)
- `GET /api/categories/:id` - Get category by ID

### Reports
- `GET /api/reports/summary` - Get financial summary (total income, expense, balance)
- `GET /api/reports/daily?date=YYYY-MM-DD` - Get daily report
- `GET /api/reports/weekly?weekStart=YYYY-MM-DD` - Get weekly report
- `GET /api/reports/monthly?year=YYYY&month=MM` - Get monthly report
- `GET /api/reports/statistics` - Get summary statistics

### Alerts
- `GET /api/alerts` - Get all alerts (filters: isRead, type)
- `GET /api/alerts/:id` - Get alert by ID
- `POST /api/alerts` - Create new alert
- `PATCH /api/alerts/:id/read` - Mark alert as read
- `DELETE /api/alerts/:id` - Delete alert

### Reminders
- `GET /api/reminders` - Get all reminders (filters: completed, dueDate)
- `GET /api/reminders/:id` - Get reminder by ID
- `POST /api/reminders` - Create new reminder
- `PUT /api/reminders/:id` - Update reminder
- `PATCH /api/reminders/:id/toggle` - Toggle reminder completion
- `DELETE /api/reminders/:id` - Delete reminder

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `POST /api/settings/verify-pin` - Verify PIN

## Authentication

Currently, the API uses a simple header-based authentication:
- Include `x-user-id` header in requests to protected routes

**Note:** For production, implement proper JWT authentication.

## Logging

The application uses Winston for logging with the following features:

- **Console logging** in development with colors
- **File logging** in production with daily rotation
- **Separate error logs** for easier debugging
- **Structured logging** with metadata

Logs are stored in the `logs/` directory:
- `combined-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

Log levels: `error`, `warn`, `info`, `debug`

## Error Handling

The application uses a centralized error handling system:

- **Custom Error Classes**: `AppError`, `BadRequestError`, `UnauthorizedError`, `NotFoundError`, etc.
- **Error Middleware**: Catches and formats all errors consistently
- **Prisma Error Handling**: Automatically handles database errors
- **Validation Errors**: Returns detailed validation error messages

Error responses follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "errors": [] // For validation errors
}
```

## Database Schema

### Models

- **User** - User accounts
- **Category** - Income/Expense categories
- **Transaction** - Financial transactions (income/expense)
- **Alert** - User alerts and notifications
- **Reminder** - Task reminders
- **UserSettings** - User preferences and settings

## Default Categories

The database is seeded with the following categories:

**Income:**
- Sales
- Processing
- Packaging
- Other

**Expense:**
- Seeds
- Transport
- Labor
- Utilities

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Prisma Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and run migrations
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Seed database
npm run prisma:seed
```

### Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding script
├── src/
│   ├── config/
│   │   └── database.ts    # Prisma client configuration
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── routes/            # Route definitions
│   ├── middleware/        # Custom middleware
│   │   ├── auth.ts        # Authentication
│   │   ├── errorHandler.ts # Error handling
│   │   ├── logger.ts      # Request logging
│   │   ├── validation.ts  # Input validation
│   │   └── asyncHandler.ts # Async error wrapper
│   ├── types/             # TypeScript types
│   ├── utils/             # Utilities
│   │   ├── logger.ts      # Winston logger
│   │   └── errors.ts      # Custom error classes
│   └── server.ts          # Express server setup
├── uploads/               # File uploads directory
├── logs/                  # Log files (gitignored)
├── dist/                  # Compiled JavaScript (gitignored)
├── .env                   # Environment variables
├── tsconfig.json          # TypeScript configuration
├── package.json
└── README.md
```

## License

ISC
