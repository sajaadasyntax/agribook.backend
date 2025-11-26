import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { logWarn } from '../utils/logger';
import prisma from '../config/database';

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      logWarn('Authentication failed: Missing user ID', { url: req.url, ip: req.ip });
      throw new UnauthorizedError('Authentication required. Please provide x-user-id header.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logWarn('Authentication failed: User not found', { userId, url: req.url });
      throw new NotFoundError('User not found');
    }

    req.user = user;
    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
};

