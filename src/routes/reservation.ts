import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, ReservationController.getAllReservations);
router.get('/:id', authMiddleware, ReservationController.getReservationById);
router.post('/', authMiddleware, ReservationController.createReservation);
router.put('/:id', authMiddleware, ReservationController.updateReservation);
router.delete('/:id', authMiddleware, ReservationController.deleteReservation);

router.post('/:id/payments', authMiddleware, ReservationController.registerPayment);
router.post('/:id/pdf', authMiddleware, ReservationController.generatePdf);

router.get('/:id/payments', authMiddleware, ReservationController.getReservationPayments);

export default router;
