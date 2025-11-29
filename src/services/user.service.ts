import prisma from '../config/database';
import { NotFoundError, ConflictError, DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import fileService from './file.service';

export class UserService {
  async createOrGetUser(email?: string, name?: string, phone?: string, companyName?: string, logoUrl?: string) {
    try {
      logInfo('Creating or getting user', { email, name, companyName });

      let user = null;

      if (email) {
        user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          logInfo('User found by email', { userId: user.id, email });
        }
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email || undefined,
            name: name || 'User',
            phone: phone || undefined,
            companyName: companyName || undefined,
            logoUrl: logoUrl || undefined,
          },
        });
        
        logInfo('User created', { userId: user.id, email: user.email });
        
        // Return user with full logo URL if it exists
        user = {
          ...user,
          logoUrl: user.logoUrl ? (fileService.getLogoUrl(user.logoUrl) || user.logoUrl) : user.logoUrl,
        };
      } else {
        // Update existing user with company data if provided
        if (companyName || logoUrl) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(companyName && { companyName }),
              ...(logoUrl && { logoUrl }),
            },
          });
          
          logInfo('User updated with company data', { userId: user.id });
          
          // Return user with full logo URL if it exists
          user = {
            ...user,
            logoUrl: user.logoUrl ? (fileService.getLogoUrl(user.logoUrl) || user.logoUrl) : user.logoUrl,
          };
        }
      }

      // Ensure default settings exist
      const settings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
        },
      });

      logInfo('User settings ensured', { userId: user.id });

      return { 
        user: {
          ...user,
          logoUrl: user.logoUrl ? (fileService.getLogoUrl(user.logoUrl) || user.logoUrl) : user.logoUrl,
        },
        settings 
      };
    } catch (error) {
      logError('Error creating or getting user', error, { email, name });
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new ConflictError('User with this email already exists');
      }
      throw new DatabaseError('Failed to create or get user');
    }
  }

  async getUserById(userId: string) {
    try {
      logInfo('Fetching user by ID', { userId });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          settings: true,
        },
      });

      if (!user) {
        logError('User not found', new Error('User not found'), { userId });
        throw new NotFoundError('User not found');
      }

      // Remove pinHash from settings for security
      // Return a new object with settings without pinHash rather than mutating
      const { settings, ...userWithoutSettings } = user;
      const safeUser = {
        ...userWithoutSettings,
        logoUrl: fileService.getLogoUrl(user.logoUrl) || user.logoUrl,
        settings: settings ? {
          id: settings.id,
          userId: settings.userId,
          language: settings.language,
          darkMode: settings.darkMode,
          autoBackup: settings.autoBackup,
          offlineMode: settings.offlineMode,
          autoSync: settings.autoSync,
          pushNotifications: settings.pushNotifications,
          emailNotifications: settings.emailNotifications,
          expenseThresholdAlert: settings.expenseThresholdAlert,
          expenseThreshold: settings.expenseThreshold,
          pinEnabled: settings.pinEnabled,
          fingerprintEnabled: settings.fingerprintEnabled,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        } : null,
      };

      return safeUser;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error fetching user', error, { userId });
      throw new DatabaseError('Failed to fetch user');
    }
  }

  async updateUser(userId: string, data: { name?: string; phone?: string; companyName?: string; logoUrl?: string }, logoFilename?: string) {
    try {
      logInfo('Updating user', { userId, fields: Object.keys(data), hasLogoFile: !!logoFilename });

      // Get existing user to delete old logo file
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      // If uploading a new logo file, process it and get the URL
      let logoUrl: string | null | undefined = data.logoUrl;
      if (logoFilename) {
        await fileService.processLogoFile(logoFilename);
        const fileUrl = fileService.getLogoUrl(logoFilename);
        logoUrl = fileUrl; // fileUrl is string | null
        
        // Delete old logo file if it exists and is different
        if (existingUser?.logoUrl && existingUser.logoUrl !== logoUrl) {
          fileService.deleteLogoFile(existingUser.logoUrl);
        }
      } else if (data.logoUrl === null || data.logoUrl === '') {
        // If logoUrl is explicitly set to null or empty, delete the old file
        logoUrl = null;
        if (existingUser?.logoUrl) {
          fileService.deleteLogoFile(existingUser.logoUrl);
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.companyName !== undefined && { companyName: data.companyName }),
          ...(logoUrl !== undefined && { logoUrl }),
        },
      });

      // Return user with full logo URL
      const userWithLogoUrl = {
        ...user,
        logoUrl: fileService.getLogoUrl(user.logoUrl) || user.logoUrl,
      };

      logInfo('User updated successfully', { userId });
      return userWithLogoUrl;
    } catch (error) {
      logError('Error updating user', error, { userId, data });
      throw new DatabaseError('Failed to update user');
    }
  }
}

export default new UserService();

