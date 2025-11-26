import prisma from '../config/database';
import { NotFoundError, BadRequestError, DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionFilters,
  PaginatedResponse,
} from '../types';
import { Transaction, TransactionType } from '@prisma/client';

export class TransactionService {
  async getTransactions(
    userId: string,
    filters: TransactionFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResponse<Transaction>> {
    try {
      logInfo('Fetching transactions', { userId, filters, limit, offset });

      const where: Record<string, unknown> = {
        userId,
      };

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          (where.createdAt as Record<string, unknown>).gte = filters.startDate;
        }
        if (filters.endDate) {
          (where.createdAt as Record<string, unknown>).lte = filters.endDate;
        }
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            category: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        }),
        prisma.transaction.count({ where }),
      ]);

      logInfo('Transactions fetched successfully', {
        userId,
        count: transactions.length,
        total,
      });

      return {
        data: transactions,
        pagination: {
          limit,
          offset,
          total,
        },
      };
    } catch (error) {
      logError('Error fetching transactions', error, { userId, filters });
      throw new DatabaseError('Failed to fetch transactions');
    }
  }

  async getTransactionById(transactionId: string, userId: string): Promise<Transaction> {
    try {
      logInfo('Fetching transaction by ID', { transactionId, userId });

      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
        },
        include: {
          category: true,
        },
      });

      if (!transaction) {
        logError('Transaction not found', new Error('Transaction not found'), {
          transactionId,
          userId,
        });
        throw new NotFoundError('Transaction not found');
      }

      logInfo('Transaction fetched successfully', { transactionId });
      return transaction;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error fetching transaction', error, { transactionId, userId });
      throw new DatabaseError('Failed to fetch transaction');
    }
  }

  async createTransaction(
    userId: string,
    data: CreateTransactionDto
  ): Promise<Transaction> {
    try {
      logInfo('Creating transaction', { userId, type: data.type, amount: data.amount });

      // Verify category exists and matches type
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        logError('Category not found', new Error('Category not found'), {
          categoryId: data.categoryId,
        });
        throw new NotFoundError('Category not found');
      }

      if (category.type !== data.type) {
        logError('Category type mismatch', new Error('Category type does not match transaction type'), {
          categoryType: category.type,
          transactionType: data.type,
        });
        throw new BadRequestError('Category type does not match transaction type');
      }

      const transaction = await prisma.transaction.create({
        data: {
          type: data.type,
          amount: data.amount,
          categoryId: data.categoryId,
          description: data.description,
          receiptUrl: data.receiptUrl,
          userId,
        },
        include: {
          category: true,
        },
      });

      logInfo('Transaction created successfully', {
        transactionId: transaction.id,
        userId,
        type: transaction.type,
        amount: transaction.amount,
      });

      return transaction;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      logError('Error creating transaction', error, { userId, data });
      throw new DatabaseError('Failed to create transaction');
    }
  }

  async updateTransaction(
    transactionId: string,
    userId: string,
    data: UpdateTransactionDto
  ): Promise<Transaction> {
    try {
      logInfo('Updating transaction', { transactionId, userId, data });

      // Check if transaction exists and belongs to user
      const existing = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
        },
      });

      if (!existing) {
        logError('Transaction not found', new Error('Transaction not found'), {
          transactionId,
          userId,
        });
        throw new NotFoundError('Transaction not found');
      }

      // Verify category if being updated
      if (data.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: data.categoryId },
        });

        if (!category) {
          logError('Category not found', new Error('Category not found'), {
            categoryId: data.categoryId,
          });
          throw new NotFoundError('Category not found');
        }

        // Verify category type matches transaction type
        if (category.type !== existing.type) {
          logError('Category type mismatch', new Error('Category type does not match transaction type'), {
            categoryType: category.type,
            transactionType: existing.type,
          });
          throw new BadRequestError('Category type does not match transaction type');
        }
      }

      const updateData: Partial<UpdateTransactionDto> = {};
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;

      const transaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          category: true,
        },
      });

      logInfo('Transaction updated successfully', { transactionId });
      return transaction;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      logError('Error updating transaction', error, { transactionId, userId, data });
      throw new DatabaseError('Failed to update transaction');
    }
  }

  async deleteTransaction(transactionId: string, userId: string): Promise<void> {
    try {
      logInfo('Deleting transaction', { transactionId, userId });

      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
        },
      });

      if (!transaction) {
        logError('Transaction not found', new Error('Transaction not found'), {
          transactionId,
          userId,
        });
        throw new NotFoundError('Transaction not found');
      }

      await prisma.transaction.delete({
        where: { id: transactionId },
      });

      logInfo('Transaction deleted successfully', { transactionId });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error deleting transaction', error, { transactionId, userId });
      throw new DatabaseError('Failed to delete transaction');
    }
  }
}

export default new TransactionService();

