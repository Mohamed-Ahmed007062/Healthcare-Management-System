import type { Request, Response } from 'express';
import { pingDB } from '../config/db';
import ApiResponse from '../utils/ApiResponse';

export class HealthController {
  /**
   * Simple server liveness check.
   */
  async check(_req: Request, res: Response): Promise<void> {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          status: 'UP',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        'Server is live and running.',
      ),
    );
  }

  /**
   * Database connectivity check.
   */
  async checkDB(_req: Request, res: Response): Promise<void> {
    const isDbConnected = await pingDB();

    if (isDbConnected) {
      res.status(200).json(
        new ApiResponse(
          200,
          {
            database: 'connected',
          },
          'Database connectivity is active.',
        ),
      );
    } else {
      res.status(503).json(
        new ApiResponse(
          503,
          {
            database: 'disconnected',
          },
          'Database connectivity test failed.',
        ),
      );
    }
  }
}

export const healthController = new HealthController();
export default healthController;
