import prisma from '../config/database';
import { NotFoundError, DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import { CreateReminderDto, UpdateReminderDto } from '../types';
import { Reminder } from '@prisma/client';

export class ReminderService {
  async getReminders(
    userId: string,
    completed?: boolean,
    dueDate?: Date
  ): Promise<Reminder[]> {
    try {
      logInfo('Fetching reminders', { userId, completed, dueDate });

      const where: Record<string, unknown> = {
        userId,
      };

      if (completed !== undefined) {
        where.completed = completed;
      }

      if (dueDate) {
        where.dueDate = {
          lte: dueDate,
        };
      }

      const reminders = await prisma.reminder.findMany({
        where,
        orderBy: {
          dueDate: 'asc',
        },
      });

      logInfo('Reminders fetched successfully', { userId, count: reminders.length });
      return reminders;
    } catch (error) {
      logError('Error fetching reminders', error, { userId, completed, dueDate });
      throw new DatabaseError('Failed to fetch reminders');
    }
  }

  async getReminderById(reminderId: string, userId: string): Promise<Reminder> {
    try {
      logInfo('Fetching reminder by ID', { reminderId, userId });

      const reminder = await prisma.reminder.findFirst({
        where: {
          id: reminderId,
          userId,
        },
      });

      if (!reminder) {
        logError('Reminder not found', new Error('Reminder not found'), {
          reminderId,
          userId,
        });
        throw new NotFoundError('Reminder not found');
      }

      logInfo('Reminder fetched successfully', { reminderId });
      return reminder;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error fetching reminder', error, { reminderId, userId });
      throw new DatabaseError('Failed to fetch reminder');
    }
  }

  async createReminder(userId: string, data: CreateReminderDto): Promise<Reminder> {
    try {
      logInfo('Creating reminder', { userId, title: data.title, dueDate: data.dueDate });

      const reminder = await prisma.reminder.create({
        data: {
          title: data.title,
          description: data.description,
          dueDate: new Date(data.dueDate),
          userId,
        },
      });

      logInfo('Reminder created successfully', { reminderId: reminder.id, userId });
      return reminder;
    } catch (error) {
      logError('Error creating reminder', error, { userId, data });
      throw new DatabaseError('Failed to create reminder');
    }
  }

  async updateReminder(
    reminderId: string,
    userId: string,
    data: UpdateReminderDto
  ): Promise<Reminder> {
    try {
      logInfo('Updating reminder', { reminderId, userId, data });

      const reminder = await prisma.reminder.findFirst({
        where: {
          id: reminderId,
          userId,
        },
      });

      if (!reminder) {
        logError('Reminder not found', new Error('Reminder not found'), {
          reminderId,
          userId,
        });
        throw new NotFoundError('Reminder not found');
      }

      const updateData: Partial<UpdateReminderDto> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
      if (data.completed !== undefined) updateData.completed = data.completed;

      const updated = await prisma.reminder.update({
        where: { id: reminderId },
        data: updateData,
      });

      logInfo('Reminder updated successfully', { reminderId });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error updating reminder', error, { reminderId, userId, data });
      throw new DatabaseError('Failed to update reminder');
    }
  }

  async toggleReminder(reminderId: string, userId: string): Promise<Reminder> {
    try {
      logInfo('Toggling reminder', { reminderId, userId });

      const reminder = await prisma.reminder.findFirst({
        where: {
          id: reminderId,
          userId,
        },
      });

      if (!reminder) {
        logError('Reminder not found', new Error('Reminder not found'), {
          reminderId,
          userId,
        });
        throw new NotFoundError('Reminder not found');
      }

      const updated = await prisma.reminder.update({
        where: { id: reminderId },
        data: { completed: !reminder.completed },
      });

      logInfo('Reminder toggled successfully', { reminderId, completed: updated.completed });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error toggling reminder', error, { reminderId, userId });
      throw new DatabaseError('Failed to toggle reminder');
    }
  }

  async deleteReminder(reminderId: string, userId: string): Promise<void> {
    try {
      logInfo('Deleting reminder', { reminderId, userId });

      const reminder = await prisma.reminder.findFirst({
        where: {
          id: reminderId,
          userId,
        },
      });

      if (!reminder) {
        logError('Reminder not found', new Error('Reminder not found'), {
          reminderId,
          userId,
        });
        throw new NotFoundError('Reminder not found');
      }

      await prisma.reminder.delete({
        where: { id: reminderId },
      });

      logInfo('Reminder deleted successfully', { reminderId });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error deleting reminder', error, { reminderId, userId });
      throw new DatabaseError('Failed to delete reminder');
    }
  }
}

export default new ReminderService();

