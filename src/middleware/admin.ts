import { Request, Response, NextFunction } from 'express';

/**
 * Simple admin authentication middleware using a static API key.
 * The admin panel must send the key in the `x-admin-key` header.
 * 
 * This is additive-only and does not touch the database.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const headerKey = req.header('x-admin-key');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    // Misconfiguration – treat as server error rather than silently allowing access
    return res.status(500).json({ message: 'Admin API key is not configured on the server' });
  }

  if (!headerKey || headerKey !== adminKey) {
    return res.status(401).json({ message: 'Unauthorized admin access' });
  }

  return next();
};


