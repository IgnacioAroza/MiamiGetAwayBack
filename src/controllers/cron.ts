import { Request, Response } from 'express';
import { CronService } from '../services/cronService.js';

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
        res.status(403).json({ error: 'You are not authorized to execute this action' });
        return;
      }

      const cronService = CronService.getInstance();
      const result = await cronService.updateReservationStatuses();
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error executing status update:', error);
      res.status(500).json({
        error: 'Error executing status update',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
} 