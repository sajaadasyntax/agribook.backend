import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import reportService from '../services/report.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class ReportController {
  getSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    logInfo('Get financial summary request', { userId, startDate, endDate });

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const summary = await reportService.getFinancialSummary(userId, filters);

    res.json(summary);
  });

  getDailyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { date } = req.query;

    logInfo('Get daily report request', { userId, date });

    const report = await reportService.getDailyReport(
      userId,
      date ? new Date(date as string) : undefined
    );

    res.json(report);
  });

  getWeeklyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { weekStart } = req.query;

    logInfo('Get weekly report request', { userId, weekStart });

    const report = await reportService.getWeeklyReport(
      userId,
      weekStart ? new Date(weekStart as string) : undefined
    );

    res.json(report);
  });

  getMonthlyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { year, month } = req.query;

    logInfo('Get monthly report request', { userId, year, month });

    const report = await reportService.getMonthlyReport(
      userId,
      year ? parseInt(year as string) : undefined,
      month ? parseInt(month as string) : undefined
    );

    res.json(report);
  });

  getStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    logInfo('Get statistics request', { userId, startDate, endDate });

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const statistics = await reportService.getStatistics(userId, filters);

    res.json(statistics);
  });
}

export default new ReportController();

