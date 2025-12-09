import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, BadRequestError, ConflictError, UnauthorizedError, NotFoundError, ForbiddenError, DatabaseError } from '../utils/errors';
import { logError } from '../utils/logger';
import { Prisma } from '@prisma/client';

// Error codes for frontend translation
export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  UNIQUE_CONSTRAINT: 'UNIQUE_CONSTRAINT',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  CATEGORY_ALREADY_EXISTS: 'CATEGORY_ALREADY_EXISTS',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FOREIGN_KEY_CONSTRAINT: 'FOREIGN_KEY_CONSTRAINT',
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  logError('Request error', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    body: req.body,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code || ERROR_CODES.VALIDATION_ERROR,
        errors: err.errors,
      });
      return;
    }

    // Determine specific error code based on error type and message
    let errorCode = err.code;
    if (!errorCode) {
      if (err instanceof BadRequestError) {
        errorCode = getValidationErrorCode(err.message);
      } else if (err instanceof UnauthorizedError) {
        errorCode = getAuthErrorCode(err.message);
      } else if (err instanceof NotFoundError) {
        errorCode = getNotFoundErrorCode(err.message);
      } else if (err instanceof ConflictError) {
        errorCode = getConflictErrorCode(err.message);
      } else if (err instanceof ForbiddenError) {
        errorCode = ERROR_CODES.FORBIDDEN;
      } else if (err instanceof DatabaseError) {
        errorCode = ERROR_CODES.DATABASE_ERROR;
      }
    }

    res.status(err.statusCode).json({
      error: err.message,
      code: errorCode || 'UNKNOWN_ERROR',
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: 'Validation error',
      code: ERROR_CODES.VALIDATION_ERROR,
    });
    return;
  }

  // Handle unknown errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: ERROR_CODES.INTERNAL_ERROR,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

// Helper functions to determine specific error codes
const getValidationErrorCode = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('email')) return ERROR_CODES.INVALID_EMAIL;
  if (msg.includes('phone') || msg.includes('mobile')) return ERROR_CODES.INVALID_PHONE;
  if (msg.includes('password') && msg.includes('short')) return ERROR_CODES.PASSWORD_TOO_SHORT;
  if (msg.includes('password')) return ERROR_CODES.INVALID_PASSWORD;
  if (msg.includes('required')) return ERROR_CODES.MISSING_REQUIRED_FIELD;
  return ERROR_CODES.VALIDATION_ERROR;
};

const getAuthErrorCode = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('expired')) return ERROR_CODES.TOKEN_EXPIRED;
  if (msg.includes('invalid') && msg.includes('token')) return ERROR_CODES.TOKEN_INVALID;
  if (msg.includes('password')) return ERROR_CODES.INVALID_CREDENTIALS;
  if (msg.includes('session')) return ERROR_CODES.SESSION_EXPIRED;
  return ERROR_CODES.UNAUTHORIZED;
};

const getNotFoundErrorCode = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('user')) return ERROR_CODES.USER_NOT_FOUND;
  if (msg.includes('category')) return ERROR_CODES.CATEGORY_NOT_FOUND;
  if (msg.includes('transaction')) return ERROR_CODES.TRANSACTION_NOT_FOUND;
  return ERROR_CODES.NOT_FOUND;
};

const getConflictErrorCode = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('phone')) return ERROR_CODES.PHONE_ALREADY_EXISTS;
  if (msg.includes('email')) return ERROR_CODES.EMAIL_ALREADY_EXISTS;
  if (msg.includes('category')) return ERROR_CODES.CATEGORY_ALREADY_EXISTS;
  return ERROR_CODES.UNIQUE_CONSTRAINT;
};

const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError, res: Response): void => {
  const target = err.meta?.target as string[] | string | undefined;
  const field = Array.isArray(target) ? target[0] : target;
  
  switch (err.code) {
    case 'P2002': {
      // Determine specific unique constraint error
      let code = ERROR_CODES.UNIQUE_CONSTRAINT;
      let message = 'This record already exists';
      
      if (field === 'phone') {
        code = ERROR_CODES.PHONE_ALREADY_EXISTS;
        message = 'This phone number is already registered';
      } else if (field === 'email') {
        code = ERROR_CODES.EMAIL_ALREADY_EXISTS;
        message = 'This email is already registered';
      } else if (field === 'name') {
        code = ERROR_CODES.CATEGORY_ALREADY_EXISTS;
        message = 'A category with this name already exists';
      }
      
      res.status(409).json({
        error: message,
        code,
        field,
      });
      break;
    }
    case 'P2025':
      res.status(404).json({
        error: 'Record not found',
        code: ERROR_CODES.NOT_FOUND,
      });
      break;
    case 'P2003':
      res.status(400).json({
        error: 'Cannot delete this record as it is being used elsewhere',
        code: ERROR_CODES.FOREIGN_KEY_CONSTRAINT,
      });
      break;
    default:
      res.status(500).json({
        error: 'Database error',
        code: ERROR_CODES.DATABASE_ERROR,
      });
  }
};

