import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export interface PaginationParams {
  limit: number;
  offset: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationParams;
}

export interface TransactionFilters {
  type?: 'INCOME' | 'EXPENSE';
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  year?: number;
  month?: number;
  weekStart?: Date;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

export interface Statistics {
  totalTransactions: number;
  averageIncome: number;
  averageExpense: number;
  netProfit: number;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
}

export interface DailyReport {
  date: string;
  transactions: unknown[];
  income: number;
  expense: number;
  balance: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  dailyData: Record<string, { income: number; expense: number; transactions: unknown[] }>;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: unknown[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  categoryData: Record<string, { income: number; expense: number; count: number }>;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  transactions: unknown[];
}

export interface CreateTransactionDto {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  categoryId: string;
  description?: string;
  receiptUrl?: string;
}

export interface UpdateTransactionDto {
  amount?: number;
  description?: string;
  categoryId?: string;
  receiptUrl?: string;
}

export interface CreateAlertDto {
  type: 'WARNING' | 'ERROR' | 'INFO' | 'SUCCESS';
  message: string;
}

export interface CreateReminderDto {
  title: string;
  description?: string;
  dueDate: Date;
  reminderType?: 'GENERAL' | 'TRANSACTION' | 'THRESHOLD';
  categoryId?: string;
  thresholdAmount?: number;
  transactionType?: 'INCOME' | 'EXPENSE';
  transactionAmount?: number;
}

export interface UpdateReminderDto {
  title?: string;
  description?: string;
  dueDate?: Date;
  completed?: boolean;
  reminderType?: 'GENERAL' | 'TRANSACTION' | 'THRESHOLD';
  categoryId?: string;
  thresholdAmount?: number;
  transactionType?: 'INCOME' | 'EXPENSE';
  transactionAmount?: number;
}

export interface CreateCategoryDto {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
}

export interface UpdateSettingsDto {
  language?: 'en' | 'ar';
  darkMode?: boolean;
  autoBackup?: boolean;
  offlineMode?: boolean;
  autoSync?: boolean;
  pushNotifications?: boolean;
  emailNotifications?: boolean;
  expenseThresholdAlert?: boolean;
  expenseThreshold?: number;
  pinEnabled?: boolean;
  pin?: string;
  fingerprintEnabled?: boolean;
}

export interface VerifyPinDto {
  pin: string;
}

