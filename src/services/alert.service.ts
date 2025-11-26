import prisma from '../config/database';
import { NotFoundError, DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import { CreateAlertDto } from '../types';
import { Alert, AlertType } from '@prisma/client';

export class AlertService {
  async getAlerts(
    userId: string,
    isRead?: boolean,
    type?: AlertType
  ): Promise<Alert[]> {
    try {
      logInfo('Fetching alerts', { userId, isRead, type });

      const where: Record<string, unknown> = {
        userId,
      };

      if (isRead !== undefined) {
        where.isRead = isRead;
      }

      if (type) {
        where.type = type;
      }

      const alerts = await prisma.alert.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      logInfo('Alerts fetched successfully', { userId, count: alerts.length });
      return alerts;
    } catch (error) {
      logError('Error fetching alerts', error, { userId, isRead, type });
      throw new DatabaseError('Failed to fetch alerts');
    }
  }

  async getAlertById(alertId: string, userId: string): Promise<Alert> {
    try {
      logInfo('Fetching alert by ID', { alertId, userId });

      const alert = await prisma.alert.findFirst({
        where: {
          id: alertId,
          userId,
        },
      });

      if (!alert) {
        logError('Alert not found', new Error('Alert not found'), { alertId, userId });
        throw new NotFoundError('Alert not found');
      }

      logInfo('Alert fetched successfully', { alertId });
      return alert;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error fetching alert', error, { alertId, userId });
      throw new DatabaseError('Failed to fetch alert');
    }
  }

  async createAlert(userId: string, data: CreateAlertDto): Promise<Alert> {
    try {
      logInfo('Creating alert', { userId, type: data.type, message: data.message });

      const alert = await prisma.alert.create({
        data: {
          type: data.type,
          message: data.message,
          userId,
        },
      });

      logInfo('Alert created successfully', { alertId: alert.id, userId });
      return alert;
    } catch (error) {
      logError('Error creating alert', error, { userId, data });
      throw new DatabaseError('Failed to create alert');
    }
  }

  async markAsRead(alertId: string, userId: string): Promise<Alert> {
    try {
      logInfo('Marking alert as read', { alertId, userId });

      const alert = await prisma.alert.findFirst({
        where: {
          id: alertId,
          userId,
        },
      });

      if (!alert) {
        logError('Alert not found', new Error('Alert not found'), { alertId, userId });
        throw new NotFoundError('Alert not found');
      }

      const updated = await prisma.alert.update({
        where: { id: alertId },
        data: { isRead: true },
      });

      logInfo('Alert marked as read', { alertId });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error marking alert as read', error, { alertId, userId });
      throw new DatabaseError('Failed to update alert');
    }
  }

  async deleteAlert(alertId: string, userId: string): Promise<void> {
    try {
      logInfo('Deleting alert', { alertId, userId });

      const alert = await prisma.alert.findFirst({
        where: {
          id: alertId,
          userId,
        },
      });

      if (!alert) {
        logError('Alert not found', new Error('Alert not found'), { alertId, userId });
        throw new NotFoundError('Alert not found');
      }

      await prisma.alert.delete({
        where: { id: alertId },
      });

      logInfo('Alert deleted successfully', { alertId });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error deleting alert', error, { alertId, userId });
      throw new DatabaseError('Failed to delete alert');
    }
  }
}

export default new AlertService();

