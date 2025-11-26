import { Request, Response, NextFunction } from 'express';
import { body, ValidationChain, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((err) => ({
        field: (err as { param?: string }).param || 'unknown',
        message: err.msg,
      }));

      throw new ValidationError('Validation failed', formattedErrors);
    }

    next();
  };
};

export const transactionValidation = [
  body('type').isIn(['INCOME', 'EXPENSE']).withMessage('Type must be INCOME or EXPENSE'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('categoryId').notEmpty().withMessage('Category ID is required'),
  body('description').optional().isString(),
  body('receiptUrl').optional().isString().isURL().withMessage('Receipt URL must be a valid URL'),
];

export const updateTransactionValidation = [
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('description').optional().isString(),
  body('categoryId').optional().notEmpty().withMessage('Category ID cannot be empty'),
  body('receiptUrl').optional().isString().isURL().withMessage('Receipt URL must be a valid URL'),
];

export const alertValidation = [
  body('type')
    .isIn(['WARNING', 'ERROR', 'INFO', 'SUCCESS'])
    .withMessage('Invalid alert type'),
  body('message').notEmpty().withMessage('Message is required'),
];

export const reminderValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('dueDate').isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
  body('description').optional().isString(),
];

export const updateReminderValidation = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().isString(),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
  body('completed').optional().isBoolean(),
];

export const settingsValidation = [
  body('language').optional().isIn(['en', 'ar']).withMessage('Language must be en or ar'),
  body('darkMode').optional().isBoolean(),
  body('autoBackup').optional().isBoolean(),
  body('offlineMode').optional().isBoolean(),
  body('autoSync').optional().isBoolean(),
  body('pushNotifications').optional().isBoolean(),
  body('emailNotifications').optional().isBoolean(),
  body('expenseThresholdAlert').optional().isBoolean(),
  body('expenseThreshold').optional().isFloat({ min: 0 }),
  body('pinEnabled').optional().isBoolean(),
  body('pin').optional().isLength({ min: 4, max: 6 }).withMessage('PIN must be between 4 and 6 digits'),
  body('fingerprintEnabled').optional().isBoolean(),
];

export const verifyPinValidation = [
  body('pin').notEmpty().withMessage('PIN is required').isLength({ min: 4, max: 6 }),
];

