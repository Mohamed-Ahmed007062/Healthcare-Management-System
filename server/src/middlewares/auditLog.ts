import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Log audit events to pino.
 * Useful for recording access/modifications of sensitive records, login attempts, etc.
 */
export function auditLog(action: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userId = req.user?.id || 'anonymous';
    const role = req.user?.role || 'none';
    const ip = req.ip || req.socket.remoteAddress;

    logger.info(
      {
        audit: true,
        action,
        userId,
        role,
        method: req.method,
        url: req.originalUrl,
        ip,
        userAgent: req.headers['user-agent'],
      },
      `Audit Log: User [${userId}] (${role}) performed [${action}] on ${req.method} ${req.originalUrl}`,
    );

    next();
  };
}

export default auditLog;
