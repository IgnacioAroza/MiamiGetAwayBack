import express from 'express';
import { CronController } from '../controllers/cron.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/update-reservation-statuses', authMiddleware, CronController.updateReservationStatuses);

export default router; 