import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { logWarn } from '../utils/logger';
import { verifyAccessToken } from '../utils/auth';
import prisma from '../config/database';

/**
 * JWT Authentication Middleware
 * Validates the Bearer token and attaches user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    // Also support x-user-id for backward compatibility during migration
    const legacyUserId = req.headers['x-user-id'] as string;
    
    if (!authHeader && !legacyUserId) {
      logWarn('Authentication failed: No credentials provided', { url: req.url, ip: req.ip });
      throw new UnauthorizedError('Authentication required. Please provide a valid token.');
    }

    let userId: string;

    // Prefer JWT token authentication
    if (authHeader) {
      // Validate format: "Bearer <token>"
      if (!authHeader.startsWith('Bearer ')) {
        logWarn('Authentication failed: Invalid authorization header format', { url: req.url });
        throw new UnauthorizedError('Invalid authorization header format. Use: Bearer <token>');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify the token
      const payload = verifyAccessToken(token);
      
      if (!payload) {
        logWarn('Authentication failed: Invalid or expired token', { url: req.url });
        throw new UnauthorizedError('Invalid or expired token. Please log in again.');
      }

      userId = payload.userId;
    } else if (legacyUserId) {
      // Legacy x-user-id header support (deprecated - will be removed)
      logWarn('Using deprecated x-user-id header for authentication', { userId: legacyUserId, url: req.url });
      userId = legacyUserId;
    } else {
      throw new UnauthorizedError('Authentication required.');
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logWarn('Authentication failed: User not found', { userId, url: req.url });
      throw new NotFoundError('User not found. Your account may have been deleted.');
    }

    // Attach user to request
    req.user = user;
    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is provided, but doesn't fail if not
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const legacyUserId = req.headers['x-user-id'] as string;

    if (!authHeader && !legacyUserId) {
      // No authentication provided, continue without user
      return next();
    }

    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      if (payload) {
        userId = payload.userId;
      }
    } else if (legacyUserId) {
      userId = legacyUserId;
    }

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (user) {
        req.user = user;
        req.userId = userId;
      }
    }

    next();
  } catch (error) {
    // On error, continue without authentication
    next();
  }
};
