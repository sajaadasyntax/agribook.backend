import prisma from '../config/database';
import { NotFoundError, ConflictError, DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';

export class UserService {
  async createOrGetUser(email?: string, name?: string, phone?: string) {
    try {
      logInfo('Creating or getting user', { email, name });

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
          },
        });
        logInfo('User created', { userId: user.id, email: user.email });
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

      return { user, settings };
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
}

export default new UserService();

