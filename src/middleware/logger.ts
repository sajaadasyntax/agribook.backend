import { Request, Response, NextFunction } from 'express';
import { logHttp } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logHttp(req, res, responseTime);
  });

  next();
};

