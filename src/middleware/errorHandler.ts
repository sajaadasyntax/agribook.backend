import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logError } from '../utils/logger';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
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
        code: err.code,
        errors: err.errors,
      });
      return;
    }

    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
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
      code: 'VALIDATION_ERROR',
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
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError, res: Response): void => {
  switch (err.code) {
    case 'P2002':
      res.status(409).json({
        error: 'Unique constraint violation',
        code: 'UNIQUE_CONSTRAINT',
        field: err.meta?.target,
      });
      break;
    case 'P2025':
      res.status(404).json({
        error: 'Record not found',
        code: 'NOT_FOUND',
      });
      break;
    case 'P2003':
      res.status(400).json({
        error: 'Foreign key constraint violation',
        code: 'FOREIGN_KEY_CONSTRAINT',
      });
      break;
    default:
      res.status(500).json({
        error: 'Database error',
        code: 'DATABASE_ERROR',
      });
  }
};

