import prisma from '../config/database';
import { NotFoundError, ConflictError, DatabaseError, BadRequestError, UnauthorizedError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import { hashPassword, comparePassword, generateTokenPair, validatePassword, verifyRefreshToken } from '../utils/auth';
import fileService from './file.service';

// Type for user with extended fields (after schema migration)
type UserWithExtendedFields = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  password?: string | null;
  companyName?: string | null;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface AuthResponse {
  user: any;
  settings: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  };
}

export class UserService {
  /**
   * Login user with email/phone and password
   */
  async loginUser(email?: string, phone?: string, password?: string): Promise<AuthResponse> {
    try {
      logInfo('Logging in user', { email, phone });

      if (!email && !phone) {
        throw new BadRequestError('Email or phone is required for login');
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
        // Note: Phone unique constraint requires Prisma regeneration after migration
        user = await prisma.user.findFirst({
          where: { phone },
        });
      }

      if (!user) {
        logError('Login failed: User not found', new Error('User not found'), { email, phone });
        throw new NotFoundError('User not found. Please register first.');
      }

      // Cast to extended type for password access
      const userExt = user as unknown as UserWithExtendedFields;

      // Verify password if user has one set
      if (userExt.password) {
        if (!password) {
          throw new BadRequestError('Password is required');
        }
        
        const isValidPassword = await comparePassword(password, userExt.password);
        if (!isValidPassword) {
          logError('Login failed: Invalid password', new Error('Invalid password'), { email, phone });
          throw new UnauthorizedError('Invalid password');
        }
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

      // Generate tokens
      const tokens = generateTokenPair(user.id, user.email || undefined);
      
      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: tokens.refreshTokenExpiresAt,
        },
      });

      const userLogoUrl = user.logoUrl;
      return { 
        user: {
          ...user,
          password: undefined, // Never send password to client
          logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
        },
        settings,
        tokens,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof UnauthorizedError) {
        throw error;
      }
      logError('Error logging in user', error, { email, phone });
      throw new DatabaseError('Failed to login user');
    }
  }

  /**
   * Register a new user
   */
  async registerUser(
    email?: string, 
    name?: string, 
    phone?: string, 
    password?: string,
    companyName?: string, 
    logoUrl?: string, 
    logoFilename?: string
  ): Promise<AuthResponse> {
    try {
      logInfo('Registering new user', { email, name, companyName, hasLogoFile: !!logoFilename });

      if (!name) {
        throw new BadRequestError('Name is required for registration');
      }

      // Validate password if provided
      if (password) {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          throw new BadRequestError(passwordValidation.errors.join('. '));
        }
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

      // Hash password if provided
      const hashedPassword = password ? await hashPassword(password) : undefined;

      // Create new user
      const user = await prisma.user.create({
        data: {
          email: email || undefined,
          name: name,
          phone: phone || undefined,
          password: hashedPassword || null,
          ...(companyName && { companyName }),
          ...(finalLogoUrl && { logoUrl: finalLogoUrl }),
        },
      });
      
      logInfo('User registered successfully', { userId: user.id, email: user.email });
      
      // Return user with full logo URL if it exists
      const userLogoUrl = user.logoUrl;
      const userWithLogo = {
        ...user,
        password: null, // Never send password to client
        logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
      };

      // Create default settings for new user
      const settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
        },
      });

      logInfo('User settings created', { userId: user.id });

      // Generate tokens
      const tokens = generateTokenPair(user.id, user.email || undefined);
      
      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: tokens.refreshTokenExpiresAt,
        },
      });

      return { 
        user: userWithLogo,
        settings,
        tokens,
      };
    } catch (error) {
      if (error instanceof ConflictError || error instanceof BadRequestError) {
        throw error;
      }
      logError('Error registering user', error, { email, name });
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new ConflictError('User with this email or phone already exists. Please login instead.');
      }
      throw new DatabaseError('Failed to register user');
    }
  }

  /**
   * Legacy: Create or get user (backward compatibility)
   */
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

      if (!user && phone) {
        user = await prisma.user.findFirst({
          where: { phone },
        });

        if (user) {
          logInfo('User found by phone', { userId: user.id, phone });
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
        const userLogoUrl = user.logoUrl;
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
          const userLogoUrl = user.logoUrl;
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

      // Generate tokens
      const tokens = generateTokenPair(user.id, user.email || undefined);
      
      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: tokens.refreshTokenExpiresAt,
        },
      });

      const userLogoUrl = user.logoUrl;
      return { 
        user: {
          ...user,
          password: undefined,
          logoUrl: userLogoUrl ? (fileService.getLogoUrl(userLogoUrl) || userLogoUrl) : userLogoUrl,
        },
        settings,
        tokens,
      };
    } catch (error) {
      logError('Error creating or getting user', error, { email, name });
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new ConflictError('User with this email already exists');
      }
      throw new DatabaseError('Failed to create or get user');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; accessTokenExpiresAt: Date }> {
    try {
      // Verify the refresh token
      const payload = verifyRefreshToken(refreshToken);
      
      if (!payload) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Check if refresh token exists in database and is not expired
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedError('Refresh token not found');
      }

      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new UnauthorizedError('Refresh token has expired');
      }

      // Generate new access token
      const tokens = generateTokenPair(storedToken.userId, storedToken.user.email || undefined);

      return {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logError('Error refreshing access token', error);
      throw new DatabaseError('Failed to refresh access token');
    }
  }

  /**
   * Logout user - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
      logInfo('User logged out, refresh token revoked');
    } catch (error) {
      logError('Error during logout', error);
      // Don't throw - logout should always succeed from user perspective
    }
  }

  /**
   * Logout from all devices - revoke all refresh tokens for user
   */
  async logoutAll(userId: string): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
      logInfo('User logged out from all devices', { userId });
    } catch (error) {
      logError('Error during logout all', error, { userId });
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

      // Remove sensitive data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { settings, password: _password, ...userWithoutSensitive } = user;
      const userLogoUrl = user.logoUrl;
      const safeUser = {
        ...userWithoutSensitive,
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
      const userLogoUrl = user.logoUrl;
      const userWithLogoUrl = {
        ...user,
        password: undefined,
        logoUrl: fileService.getLogoUrl(userLogoUrl) || userLogoUrl,
      };

      logInfo('User updated successfully', { userId });
      return userWithLogoUrl;
    } catch (error) {
      logError('Error updating user', error, { userId, data });
      throw new DatabaseError('Failed to update user');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Cast to extended type for password access
      const userExt = user as unknown as UserWithExtendedFields;

      // If user has existing password, verify it
      if (userExt.password) {
        const isValid = await comparePassword(currentPassword, userExt.password);
        if (!isValid) {
          throw new UnauthorizedError('Current password is incorrect');
        }
      }

      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        throw new BadRequestError(validation.errors.join('. '));
      }

      // Hash and update password
      const hashedPassword = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Revoke all refresh tokens for security
      await this.logoutAll(userId);

      logInfo('Password changed successfully', { userId });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      logError('Error changing password', error, { userId });
      throw new DatabaseError('Failed to change password');
    }
  }
}

export default new UserService();
