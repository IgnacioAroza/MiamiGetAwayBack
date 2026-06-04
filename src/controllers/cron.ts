import { Request, Response } from 'express';
import { CronService } from '../services/cronService.js';
import { ok, forbidden, serverError } from '../utils/response.js';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    username: string;
  };
}

export class CronController {
  public static async updateReservationStatuses(req: RequestWithUser, res: Response): Promise<void> {
    try {
      if (!req.user) {
        forbidden(res, 'You are not authorized to execute this action');
        return;
      }

      const cronService = CronService.getInstance();
      const result = await cronService.updateReservationStatuses();

      ok(res, { success: true, ...result });
    } catch (error) {
      console.error('Error executing status update:', error);
      serverError(res, 'Error executing status update',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      );
    }
  }
} 