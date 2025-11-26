import { Response } from 'express';
import { AuthenticatedRequest, UpdateSettingsDto, VerifyPinDto } from '../types';
import settingsService from '../services/settings.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class SettingsController {
  getSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;

    logInfo('Get settings request', { userId });

    const settings = await settingsService.getSettings(userId);

    res.json(settings);
  });

  updateSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const data: UpdateSettingsDto = req.body;

    logInfo('Update settings request', { userId, fields: Object.keys(data) });

    const settings = await settingsService.updateSettings(userId, data);

    res.json(settings);
  });

  verifyPin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const data: VerifyPinDto = req.body;

    logInfo('Verify PIN request', { userId });

    const result = await settingsService.verifyPin(userId, data);

    res.json(result);
  });
}

export default new SettingsController();

