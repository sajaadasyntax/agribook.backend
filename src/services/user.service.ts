import prisma from '../config/database';
import { NotFoundError, ConflictError, DatabaseError, BadRequestError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import fileService from './file.service';

export class UserService {
  async loginUser(email?: string, phone?: string) {
    try {
      logInfo('Logging in user', { email, phone });

      if (!email && !phone) {
        throw new NotFoundError('Email or phone is required for login');
      }

      let user = null;

      // Try to find user by email first
      if (email) {
        user = await prisma.user.findUnique({
          where: { email },
        });
      }

      // If not found by email, try phone
      if (!user && phone) {
        user = await prisma.user.findFirst({
          where: { phone },
        });
      }

      if (!user) {
        logError('Login failed: User not found', new Error('User not found'), { email, phone });
        throw new NotFoundError('User not found. Please register first.');
      }

      logInfo('User logged in successfully', { userId: user.id, email: user.email });

      // Ensure default settings exist
      const settings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
        },
      });

      logInfo('User settings ensured', { userId: user.id });

      const userLogoUrl = (user as any).logoUrl;
      return { 
        user: {
          ...user,
          logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
        },
        settings 
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error logging in user', error, { email, phone });
      throw new DatabaseError('Failed to login user');
    }
  }

  async registerUser(email?: string, name?: string, phone?: string, companyName?: string, logoUrl?: string, logoFilename?: string) {
    try {
      logInfo('Registering new user', { email, name, companyName, hasLogoFile: !!logoFilename });

      if (!name) {
        throw new BadRequestError('Name is required for registration');
      }

      // If uploading a new logo file, process it and get the URL
      let finalLogoUrl: string | null | undefined = logoUrl;
      if (logoFilename) {
        await fileService.processLogoFile(logoFilename);
        const fileUrl = fileService.getLogoUrl(logoFilename);
        finalLogoUrl = fileUrl;
      }

      // Check if user already exists by email
      if (email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          logError('Registration failed: User already exists', new Error('User already exists'), { email });
          throw new ConflictError('User with this email already exists. Please login instead.');
        }
      }

      // Check if user already exists by phone
      if (phone) {
        const existingUser = await prisma.user.findFirst({
          where: { phone },
        });

        if (existingUser) {
          logError('Registration failed: User already exists', new Error('User already exists'), { phone });
          throw new ConflictError('User with this phone number already exists. Please login instead.');
        }
      }

      // Create new user
      const user = await prisma.user.create({
        data: {
          email: email || undefined,
          name: name,
          phone: phone || undefined,
          ...(companyName && { companyName }),
          ...(finalLogoUrl && { logoUrl: finalLogoUrl }),
        },
      });
      
      logInfo('User registered successfully', { userId: user.id, email: user.email });
      
      // Return user with full logo URL if it exists
      const userLogoUrl = (user as any).logoUrl;
      const userWithLogo = {
        ...user,
        logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
      } as typeof user;

      // Create default settings for new user
      const settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
        },
      });

      logInfo('User settings created', { userId: user.id });

      return { 
        user: userWithLogo,
        settings 
      };
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      logError('Error registering user', error, { email, name });
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new ConflictError('User with this email or phone already exists. Please login instead.');
      }
      throw new DatabaseError('Failed to register user');
    }
  }

  async createOrGetUser(email?: string, name?: string, phone?: string, companyName?: string, logoUrl?: string, logoFilename?: string) {
    try {
      logInfo('Creating or getting user', { email, name, companyName, hasLogoFile: !!logoFilename });

      // If uploading a new logo file, process it and get the URL
      let finalLogoUrl: string | null | undefined = logoUrl;
      if (logoFilename) {
        await fileService.processLogoFile(logoFilename);
        const fileUrl = fileService.getLogoUrl(logoFilename);
        finalLogoUrl = fileUrl;
      }

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
            ...(companyName && { companyName }),
            ...(finalLogoUrl && { logoUrl: finalLogoUrl }),
          },
        });
        
        logInfo('User created', { userId: user.id, email: user.email });
        
        // Return user with full logo URL if it exists
        const userLogoUrl = (user as any).logoUrl;
        user = {
          ...user,
          logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
        } as typeof user;
      } else {
        // Update existing user with company data if provided
        if (companyName || finalLogoUrl) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(companyName && { companyName }),
              ...(finalLogoUrl && { logoUrl: finalLogoUrl }),
            },
          });
          
          logInfo('User updated with company data', { userId: user.id });
          
          // Return user with full logo URL if it exists
          const userLogoUrl = (user as any).logoUrl;
          user = {
            ...user,
            logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
          } as typeof user;
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

      const userLogoUrl = (user as any).logoUrl;
      return { 
        user: {
          ...user,
          logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
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
      const userLogoUrl = (user as any).logoUrl;
      const safeUser = {
        ...userWithoutSettings,
        logoUrl: fileService.getLogoUrl(userLogoUrl) || userLogoUrl,
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
        const existingLogoUrl = (existingUser as any)?.logoUrl;
        if (existingLogoUrl && existingLogoUrl !== logoUrl) {
          fileService.deleteLogoFile(existingLogoUrl);
        }
      } else if (data.logoUrl === null || data.logoUrl === '') {
        // If logoUrl is explicitly set to null or empty, delete the old file
        logoUrl = null;
        const existingLogoUrl = (existingUser as any)?.logoUrl;
        if (existingLogoUrl) {
          fileService.deleteLogoFile(existingLogoUrl);
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
      const userLogoUrl = (user as any).logoUrl;
      const userWithLogoUrl = {
        ...user,
        logoUrl: fileService.getLogoUrl(userLogoUrl) || userLogoUrl,
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

