import prisma from '../config/database';
import { NotFoundError, BadRequestError, DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import { UpdateSettingsDto, VerifyPinDto } from '../types';
import { UserSettings } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class SettingsService {
  async getSettings(userId: string): Promise<Omit<UserSettings, 'pinHash'>> {
    try {
      logInfo('Fetching user settings', { userId });

      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        logInfo('Settings not found, creating default', { userId });
        settings = await prisma.userSettings.create({
          data: {
            userId,
          },
        });
      }

      const { pinHash, ...safeSettings } = settings;
      logInfo('Settings fetched successfully', { userId });
      return safeSettings;
    } catch (error) {
      logError('Error fetching settings', error, { userId });
      throw new DatabaseError('Failed to fetch settings');
    }
  }

  async updateSettings(
    userId: string,
    data: UpdateSettingsDto
  ): Promise<Omit<UserSettings, 'pinHash'>> {
    try {
      logInfo('Updating user settings', { userId, fields: Object.keys(data) });

      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
          },
        });
      }

      const updateData: Partial<UserSettings> = {};
      const allowedFields: Array<keyof UpdateSettingsDto> = [
        'language',
        'darkMode',
        'autoBackup',
        'offlineMode',
        'autoSync',
        'pushNotifications',
        'emailNotifications',
        'expenseThresholdAlert',
        'expenseThreshold',
        'pinEnabled',
        'fingerprintEnabled',
      ];

      allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
          (updateData as Record<string, unknown>)[field] = data[field];
        }
      });

      // Handle PIN separately for hashing
      if (data.pin !== undefined) {
        if (data.pin) {
          if (data.pin.length < 4 || data.pin.length > 6) {
            throw new BadRequestError('PIN must be between 4 and 6 digits');
          }
          const salt = await bcrypt.genSalt(10);
          updateData.pinHash = await bcrypt.hash(data.pin, salt);
          updateData.pinEnabled = true;
          logInfo('PIN updated', { userId });
        } else {
          updateData.pinHash = null;
          updateData.pinEnabled = false;
          // If PIN is disabled, also disable fingerprint
          updateData.fingerprintEnabled = false;
          logInfo('PIN disabled, fingerprint also disabled', { userId });
        }
      }

      // Validate fingerprint can only be enabled if PIN is enabled
      // Check this after processing PIN updates but before database update
      if (updateData.fingerprintEnabled === true) {
        // Determine if PIN will be enabled after this update
        let willHavePin: boolean;
        if (updateData.pinEnabled !== undefined) {
          willHavePin = updateData.pinEnabled === true;
        } else if (data.pin !== undefined && data.pin) {
          // PIN is being set, so it will be enabled
          willHavePin = true;
        } else {
          // Check current settings
          const currentSettings = await prisma.userSettings.findUnique({
            where: { userId },
          });
          willHavePin = currentSettings?.pinEnabled ?? false;
        }
        
        if (!willHavePin) {
          throw new BadRequestError('PIN must be enabled before enabling fingerprint authentication');
        }
      }
      
      // If PIN is being disabled via pinEnabled flag, also disable fingerprint
      if (updateData.pinEnabled === false) {
        updateData.fingerprintEnabled = false;
      }

      const updated = await prisma.userSettings.update({
        where: { userId },
        data: updateData,
      });

      const { pinHash, ...safeSettings } = updated;
      logInfo('Settings updated successfully', { userId });
      return safeSettings;
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      logError('Error updating settings', error, { userId, data });
      throw new DatabaseError('Failed to update settings');
    }
  }

  async verifyPin(userId: string, data: VerifyPinDto): Promise<{ valid: boolean }> {
    try {
      logInfo('Verifying PIN', { userId });

      if (!data.pin) {
        throw new BadRequestError('PIN is required');
      }

      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings || !settings.pinHash) {
        logError('PIN not set', new Error('PIN not set'), { userId });
        throw new NotFoundError('PIN not set');
      }

      const isValid = await bcrypt.compare(data.pin, settings.pinHash);

      logInfo('PIN verification result', { userId, valid: isValid });
      return { valid: isValid };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      logError('Error verifying PIN', error, { userId });
      throw new DatabaseError('Failed to verify PIN');
    }
  }
}

export default new SettingsService();

