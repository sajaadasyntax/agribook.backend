import { Response } from 'express';
import { AuthenticatedRequest, CreateReminderDto, UpdateReminderDto } from '../types';
import reminderService from '../services/reminder.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class ReminderController {
  getReminders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { completed, dueDate } = req.query;

    logInfo('Get reminders request', { userId, completed, dueDate });

    const reminders = await reminderService.getReminders(
      userId,
      completed === 'true' ? true : completed === 'false' ? false : undefined,
      dueDate ? new Date(dueDate as string) : undefined
    );

    res.json(reminders);
  });

  getReminderById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Get reminder by ID request', { userId, reminderId: id });

    const reminder = await reminderService.getReminderById(id, userId);

    res.json(reminder);
  });

  createReminder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const data: CreateReminderDto = req.body;

    logInfo('Create reminder request', {
      userId,
      title: data.title,
      dueDate: data.dueDate,
    });

    const reminder = await reminderService.createReminder(userId, data);

    res.status(201).json(reminder);
  });

  updateReminder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const data: UpdateReminderDto = req.body;

    logInfo('Update reminder request', { userId, reminderId: id, data });

    const reminder = await reminderService.updateReminder(id, userId, data);

    res.json(reminder);
  });

  toggleReminder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Toggle reminder request', { userId, reminderId: id });

    const reminder = await reminderService.toggleReminder(id, userId);

    res.json(reminder);
  });

  deleteReminder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Delete reminder request', { userId, reminderId: id });

    await reminderService.deleteReminder(id, userId);

    res.json({ message: 'Reminder deleted successfully' });
  });
}

export default new ReminderController();

