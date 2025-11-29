import prisma from '../config/database';
import { logInfo, logError } from '../utils/logger';
import alertService from './alert.service';
import { AlertType } from '@prisma/client';

export class NotificationService {
  /**
   * Check threshold reminders when an expense transaction is created or updated
   */
  async checkThresholdReminders(
    userId: string,
    categoryId: string,
    amount: number
  ): Promise<void> {
    try {
      logInfo('Checking threshold reminders', { userId, categoryId, amount });

      // Find all active threshold reminders for this user and category
      const reminders = await prisma.reminder.findMany({
        where: {
          userId,
          reminderType: 'THRESHOLD',
          completed: false,
          categoryId: categoryId,
          thresholdAmount: {
            not: null,
          },
        },
        include: {
          category: true,
        },
      });

      for (const reminder of reminders) {
        if (reminder.thresholdAmount && amount >= Number(reminder.thresholdAmount)) {
          const categoryName = reminder.category?.name || 'this category';
          const message = `Threshold reminder: ${reminder.title}. Expense of $${amount} in ${categoryName} has exceeded the threshold of $${reminder.thresholdAmount}`;

          await alertService.createAlert(userId, {
            type: 'WARNING',
            message,
          });

          logInfo('Threshold reminder triggered', {
            reminderId: reminder.id,
            userId,
            thresholdAmount: reminder.thresholdAmount,
            actualAmount: amount,
          });

          // Optionally mark reminder as completed
          // await prisma.reminder.update({
          //   where: { id: reminder.id },
          //   data: { completed: true },
          // });
        }
      }
    } catch (error) {
      logError('Error checking threshold reminders', error, { userId, categoryId, amount });
      // Don't throw - this is a background process
    }
  }

  /**
   * Check transaction reminders by due date
   * This should be called periodically (e.g., via a cron job)
   */
  async checkTransactionReminders(): Promise<void> {
    try {
      logInfo('Checking transaction reminders by due date');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Find all active transaction reminders that are due today or in the past
      const reminders = await prisma.reminder.findMany({
        where: {
          reminderType: 'TRANSACTION',
          completed: false,
          dueDate: {
            lte: now,
          },
        },
        include: {
          category: true,
        },
      });

      for (const reminder of reminders) {
        const dueDate = new Date(reminder.dueDate);
        const isToday = dueDate.toDateString() === today.toDateString();

        if (isToday || dueDate < today) {
          const transactionType = reminder.transactionType === 'INCOME' ? 'Income' : 'Expense';
          const amount = reminder.transactionAmount
            ? ` of $${reminder.transactionAmount}`
            : '';
          const categoryName = reminder.category?.name
            ? ` in ${reminder.category.name}`
            : '';
          const message = `Transaction reminder: ${reminder.title}. ${transactionType} transaction${amount}${categoryName} is due today.`;

          await alertService.createAlert(reminder.userId, {
            type: 'INFO',
            message,
          });

          logInfo('Transaction reminder triggered', {
            reminderId: reminder.id,
            userId: reminder.userId,
            dueDate: reminder.dueDate,
          });

          // Optionally mark reminder as completed
          // await prisma.reminder.update({
          //   where: { id: reminder.id },
          //   data: { completed: true },
          // });
        }
      }

      logInfo('Transaction reminders check completed', {
        checked: reminders.length,
      });
    } catch (error) {
      logError('Error checking transaction reminders', error);
      // Don't throw - this is a background process
    }
  }

  /**
   * Check general reminders by due date
   */
  async checkGeneralReminders(): Promise<void> {
    try {
      logInfo('Checking general reminders by due date');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Find all active general reminders that are due today or in the past
      const reminders = await prisma.reminder.findMany({
        where: {
          reminderType: 'GENERAL',
          completed: false,
          dueDate: {
            lte: now,
          },
        },
      });

      for (const reminder of reminders) {
        const dueDate = new Date(reminder.dueDate);
        const isToday = dueDate.toDateString() === today.toDateString();

        if (isToday || dueDate < today) {
          const message = `Reminder: ${reminder.title}${reminder.description ? ` - ${reminder.description}` : ''}`;

          await alertService.createAlert(reminder.userId, {
            type: 'INFO',
            message,
          });

          logInfo('General reminder triggered', {
            reminderId: reminder.id,
            userId: reminder.userId,
            dueDate: reminder.dueDate,
          });
        }
      }

      logInfo('General reminders check completed', {
        checked: reminders.length,
      });
    } catch (error) {
      logError('Error checking general reminders', error);
      // Don't throw - this is a background process
    }
  }

  /**
   * Check all reminders (convenience method)
   */
  async checkAllReminders(): Promise<void> {
    await Promise.all([
      this.checkTransactionReminders(),
      this.checkGeneralReminders(),
    ]);
  }
}

export default new NotificationService();

