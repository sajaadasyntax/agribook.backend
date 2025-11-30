import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { logError } from './logger';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Access token expires in 15 minutes
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Refresh token expires in 7 days
const SALT_ROUNDS = 12;

// Warn if using default secrets in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.error('⚠️  WARNING: Using default JWT secrets in production. Set JWT_SECRET and JWT_REFRESH_SECRET environment variables!');
  }
}

export interface TokenPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain text password with a hashed password
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate access token
 */
export const generateAccessToken = (userId: string, email?: string): string => {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'access',
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string, email?: string): string => {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'refresh',
  };
  
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId: string, email?: string): TokenPair => {
  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken(userId, email);
  
  // Calculate expiration dates
  const accessTokenExpiresAt = new Date(Date.now() + parseTimeToMs(JWT_EXPIRES_IN));
  const refreshTokenExpiresAt = new Date(Date.now() + parseTimeToMs(JWT_REFRESH_EXPIRES_IN));
  
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & TokenPayload;
    
    if (decoded.type !== 'access') {
      return null;
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      type: decoded.type,
    };
  } catch (error) {
    logError('Access token verification failed', error);
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload & TokenPayload;
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      type: decoded.type,
    };
  } catch (error) {
    logError('Refresh token verification failed', error);
    return null;
  }
};

/**
 * Generate a secure random token (for refresh token storage)
 */
export const generateSecureToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Parse time string to milliseconds (e.g., '15m' -> 900000)
 */
const parseTimeToMs = (time: string): number => {
  const match = time.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 15 * 60 * 1000; // Default 15 minutes
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

/**
 * Get refresh token expiration date
 */
export const getRefreshTokenExpiration = (): Date => {
  return new Date(Date.now() + parseTimeToMs(JWT_REFRESH_EXPIRES_IN));
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // Optional: Add more password requirements
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Password must contain at least one lowercase letter');
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

