import { Response } from 'express';
import { AuthenticatedRequest, CreateAlertDto } from '../types';
import alertService from '../services/alert.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';
import { AlertType } from '@prisma/client';

export class AlertController {
  getAlerts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { isRead, type } = req.query;

    logInfo('Get alerts request', { userId, isRead, type });

    const alerts = await alertService.getAlerts(
      userId,
      isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type as AlertType | undefined
    );

    res.json(alerts);
  });

  getAlertById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Get alert by ID request', { userId, alertId: id });

    const alert = await alertService.getAlertById(id, userId);

    res.json(alert);
  });

  createAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const data: CreateAlertDto = req.body;

    logInfo('Create alert request', { userId, type: data.type, message: data.message });

    const alert = await alertService.createAlert(userId, data);

    res.status(201).json(alert);
  });

  markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Mark alert as read request', { userId, alertId: id });

    const alert = await alertService.markAsRead(id, userId);

    res.json(alert);
  });

  deleteAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    logInfo('Delete alert request', { userId, alertId: id });

    await alertService.deleteAlert(id, userId);

    res.json({ message: 'Alert deleted successfully' });
  });
}

export default new AlertController();

