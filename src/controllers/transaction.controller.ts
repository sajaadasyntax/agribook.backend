import { Response } from 'express';
import { AuthenticatedRequest, CreateTransactionDto, UpdateTransactionDto } from '../types';
import transactionService from '../services/transaction.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class TransactionController {
  getTransactions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { type, categoryId, startDate, endDate, limit, offset } = req.query;

    logInfo('Get transactions request', {
      userId,
      type,
      categoryId,
      startDate,
      endDate,
      limit,
      offset,
    });

    const filters = {
      type: type as 'INCOME' | 'EXPENSE' | undefined,
      categoryId: categoryId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const result = await transactionService.getTransactions(
      userId,
      filters,
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );

    res.json(result);
  });

  getTransactionById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Get transaction by ID request', { userId, transactionId: id });

    const transaction = await transactionService.getTransactionById(id, userId);

    res.json(transaction);
  });

  createTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const data: CreateTransactionDto = req.body;

    logInfo('Create transaction request', { userId, type: data.type, amount: data.amount });

    const transaction = await transactionService.createTransaction(userId, data);

    res.status(201).json(transaction);
  });

  updateTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const data: UpdateTransactionDto = req.body;

    logInfo('Update transaction request', { userId, transactionId: id, data });

    const transaction = await transactionService.updateTransaction(id, userId, data);

    res.json(transaction);
  });

  deleteTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Delete transaction request', { userId, transactionId: id });

    await transactionService.deleteTransaction(id, userId);

    res.json({ message: 'Transaction deleted successfully' });
  });
}

export default new TransactionController();

