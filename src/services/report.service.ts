import prisma from '../config/database';
import { DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import {
  FinancialSummary,
  Statistics,
  DailyReport,
  WeeklyReport,
  MonthlyReport,
  ReportFilters,
} from '../types';

export class ReportService {
  async getFinancialSummary(userId: string, filters?: ReportFilters): Promise<FinancialSummary> {
    try {
      logInfo('Fetching financial summary', { userId, filters });

      const where: Record<string, unknown> = {
        userId,
      };

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          (where.createdAt as Record<string, unknown>).gte = filters.startDate;
        }
        if (filters.endDate) {
          (where.createdAt as Record<string, unknown>).lte = filters.endDate;
        }
      }

      const [income, expenses] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...where, type: 'INCOME' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.transaction.aggregate({
          where: { ...where, type: 'EXPENSE' },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const totalIncome = Number(income._sum.amount || 0);
      const totalExpense = Number(expenses._sum.amount || 0);
      const balance = totalIncome - totalExpense;

      logInfo('Financial summary fetched successfully', {
        userId,
        totalIncome,
        totalExpense,
        balance,
      });

      return {
        totalIncome,
        totalExpense,
        balance,
        incomeCount: income._count,
        expenseCount: expenses._count,
      };
    } catch (error) {
      logError('Error fetching financial summary', error, { userId, filters });
      throw new DatabaseError('Failed to fetch financial summary');
    }
  }

  async getDailyReport(userId: string, date?: Date): Promise<DailyReport> {
    try {
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      logInfo('Fetching daily report', { userId, date: startOfDay.toISOString() });

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const income = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      logInfo('Daily report fetched successfully', { userId, income, expense });

      return {
        date: startOfDay.toISOString().split('T')[0],
        transactions,
        income,
        expense,
        balance: income - expense,
      };
    } catch (error) {
      logError('Error fetching daily report', error, { userId, date });
      throw new DatabaseError('Failed to fetch daily report');
    }
  }

  async getWeeklyReport(userId: string, weekStart?: Date): Promise<WeeklyReport> {
    try {
      const startDate = weekStart || new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      logInfo('Fetching weekly report', {
        userId,
        weekStart: startDate.toISOString(),
        weekEnd: endDate.toISOString(),
      });

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const dailyData: Record<string, { income: number; expense: number; transactions: unknown[] }> = {};
      transactions.forEach((t) => {
        const day = t.createdAt.toISOString().split('T')[0];
        if (!dailyData[day]) {
          dailyData[day] = { income: 0, expense: 0, transactions: [] };
        }
        if (t.type === 'INCOME') {
          dailyData[day].income += Number(t.amount);
        } else {
          dailyData[day].expense += Number(t.amount);
        }
        dailyData[day].transactions.push(t);
      });

      const totalIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      logInfo('Weekly report fetched successfully', { userId, totalIncome, totalExpense });

      return {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        dailyData,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactions,
      };
    } catch (error) {
      logError('Error fetching weekly report', error, { userId, weekStart });
      throw new DatabaseError('Failed to fetch weekly report');
    }
  }

  async getMonthlyReport(userId: string, year?: number, month?: number): Promise<MonthlyReport> {
    try {
      const targetDate = year && month ? new Date(year, month - 1) : new Date();
      const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      logInfo('Fetching monthly report', {
        userId,
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
      });

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const categoryData: Record<string, { income: number; expense: number; count: number }> = {};
      transactions.forEach((t) => {
        const catName = t.category.name;
        if (!categoryData[catName]) {
          categoryData[catName] = { income: 0, expense: 0, count: 0 };
        }
        if (t.type === 'INCOME') {
          categoryData[catName].income += Number(t.amount);
        } else {
          categoryData[catName].expense += Number(t.amount);
        }
        categoryData[catName].count++;
      });

      const totalIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Monthly trend (last 12 months) - optimized to use single query
      const trendStartDate = new Date(targetDate);
      trendStartDate.setMonth(trendStartDate.getMonth() - 11);
      trendStartDate.setDate(1);
      trendStartDate.setHours(0, 0, 0, 0);
      
      const trendEndDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      // Fetch all transactions for the 12-month period in a single query
      const trendTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: trendStartDate,
            lte: trendEndDate,
          },
        },
        select: {
          type: true,
          amount: true,
          createdAt: true,
        },
      });

      // Group transactions by month in memory
      const monthlyData: Record<string, { income: number; expense: number }> = {};
      
      // Initialize all 12 months
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(targetDate);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }

      // Aggregate transactions by month
      trendTransactions.forEach((t) => {
        const tDate = new Date(t.createdAt);
        const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[monthKey]) {
          if (t.type === 'INCOME') {
            monthlyData[monthKey].income += Number(t.amount);
          } else {
            monthlyData[monthKey].expense += Number(t.amount);
          }
        }
      });

      // Build monthly trend array
      const monthlyTrend = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(targetDate);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const data = monthlyData[monthKey] || { income: 0, expense: 0 };
        
        monthlyTrend.push({
          month: monthDate.toLocaleString('default', { month: 'short' }),
          income: Number(data.income),
          expense: Number(data.expense),
          balance: Number(data.income - data.expense),
        });
      }

      logInfo('Monthly report fetched successfully', {
        userId,
        totalIncome,
        totalExpense,
        transactionCount: transactions.length,
      });

      return {
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        categoryData,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: transactions.length,
        monthlyTrend,
        transactions,
      };
    } catch (error) {
      logError('Error fetching monthly report', error, { userId, year, month });
      throw new DatabaseError('Failed to fetch monthly report');
    }
  }

  async getStatistics(userId: string, filters?: ReportFilters): Promise<Statistics> {
    try {
      logInfo('Fetching statistics', { userId, filters });

      const where: Record<string, unknown> = {
        userId,
      };

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          (where.createdAt as Record<string, unknown>).gte = filters.startDate;
        }
        if (filters.endDate) {
          (where.createdAt as Record<string, unknown>).lte = filters.endDate;
        }
      }

      const [totalCount, incomeStats, expenseStats] = await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.aggregate({
          where: { ...where, type: 'INCOME' },
          _sum: { amount: true },
          _avg: { amount: true },
          _count: true,
        }),
        prisma.transaction.aggregate({
          where: { ...where, type: 'EXPENSE' },
          _sum: { amount: true },
          _avg: { amount: true },
          _count: true,
        }),
      ]);

      const totalIncome = Number(incomeStats._sum.amount || 0);
      const totalExpense = Number(expenseStats._sum.amount || 0);
      const netProfit = totalIncome - totalExpense;

      logInfo('Statistics fetched successfully', {
        userId,
        totalTransactions: totalCount,
        netProfit,
      });

      return {
        totalTransactions: totalCount,
        averageIncome: Number(incomeStats._avg.amount || 0),
        averageExpense: Number(expenseStats._avg.amount || 0),
        netProfit,
        totalIncome,
        totalExpense,
        incomeCount: incomeStats._count,
        expenseCount: expenseStats._count,
      };
    } catch (error) {
      logError('Error fetching statistics', error, { userId, filters });
      throw new DatabaseError('Failed to fetch statistics');
    }
  }
}

export default new ReportService();

