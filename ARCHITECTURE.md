# Architecture Overview

This document describes the architecture and design patterns used in the AgriBooks backend.

## Architecture Pattern

The application follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         HTTP Layer (Routes)         │
│  - Route definitions                │
│  - Middleware application           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Controller Layer               │
│  - Request/Response handling        │
│  - Input validation                 │
│  - Error formatting                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Service Layer                │
│  - Business logic                   │
│  - Data transformation              │
│  - Business rules enforcement       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Data Access Layer (Prisma)     │
│  - Database queries                 │
│  - Data persistence                 │
└─────────────────────────────────────┘
```

## Layer Responsibilities

### Routes Layer (`src/routes/`)
- Define API endpoints
- Apply middleware (authentication, validation)
- Map HTTP methods to controller methods
- **No business logic**

### Controllers Layer (`src/controllers/`)
- Handle HTTP requests and responses
- Extract and validate request data
- Call appropriate service methods
- Format responses
- **No business logic**

### Services Layer (`src/services/`)
- Contain all business logic
- Data validation and transformation
- Business rules enforcement
- Database operations (via Prisma)
- **No HTTP concerns**

### Middleware (`src/middleware/`)
- **Authentication**: Verify user identity
- **Validation**: Validate request data
- **Error Handling**: Centralized error processing
- **Logging**: Request/response logging
- **Async Handler**: Wrapper for async route handlers

### Utilities (`src/utils/`)
- **Logger**: Winston-based logging system
- **Errors**: Custom error classes

## Data Flow

1. **Request arrives** → Route handler
2. **Authentication** → Middleware verifies user
3. **Validation** → Middleware validates input
4. **Controller** → Extracts data, calls service
5. **Service** → Executes business logic, queries database
6. **Response** → Controller formats response
7. **Error Handling** → Any errors caught and formatted
8. **Logging** → All steps logged

## Error Handling Strategy

### Custom Error Classes
- `AppError`: Base error class
- `BadRequestError`: 400 errors
- `UnauthorizedError`: 401 errors
- `NotFoundError`: 404 errors
- `ValidationError`: Validation failures with field details
- `DatabaseError`: Database operation failures

### Error Flow
1. Service throws custom error
2. Controller passes error through
3. Error handler middleware catches it
4. Error formatted and sent to client
5. Error logged with context

## Logging Strategy

### Log Levels
- **Error**: Errors and exceptions
- **Warn**: Warnings and potential issues
- **Info**: General information (default)
- **Debug**: Detailed debugging information

### Logging Points
- **Request/Response**: All HTTP requests logged with timing
- **Service Operations**: Business logic operations
- **Errors**: All errors with stack traces
- **Database Queries**: Query logging in development

### Log Outputs
- **Development**: Console with colors
- **Production**: Files with daily rotation
- **Errors**: Separate error log files

## Type Safety

### TypeScript Usage
- All code written in TypeScript
- Strict type checking enabled
- Prisma generates types from schema
- Custom types in `src/types/`

### Type Definitions
- Request/Response types
- DTOs (Data Transfer Objects)
- Service method signatures
- Database model types (from Prisma)

## Best Practices

### 1. Separation of Concerns
- Each layer has a single responsibility
- No business logic in controllers
- No HTTP concerns in services

### 2. Error Handling
- Always use custom error classes
- Let errors bubble up to middleware
- Never swallow errors silently

### 3. Logging
- Log at appropriate levels
- Include context in logs
- Log errors with stack traces

### 4. Validation
- Validate at the route level
- Use express-validator
- Return detailed validation errors

### 5. Async/Await
- Always use async/await
- Wrap async handlers with asyncHandler
- Handle promise rejections

### 6. Type Safety
- Use TypeScript types everywhere
- Avoid `any` type
- Use Prisma generated types

## Testing Considerations

The architecture supports easy testing:

- **Services**: Can be tested in isolation (mock Prisma)
- **Controllers**: Can be tested with mocked services
- **Routes**: Can be tested with integration tests
- **Middleware**: Can be tested independently

## Future Enhancements

- Add repository pattern for data access abstraction
- Implement dependency injection
- Add caching layer
- Implement rate limiting
- Add API documentation (Swagger/OpenAPI)

