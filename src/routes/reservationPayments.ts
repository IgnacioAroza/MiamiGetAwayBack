import { Router } from 'express';
import { ReservationPaymentController } from '../controllers/reservationPayments.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, ReservationPaymentController.getAllReservationPayments);
router.get('/:id', authMiddleware, ReservationPaymentController.getReservationPaymentById);
router.post('/', authMiddleware, ReservationPaymentController.createReservationPayment);
router.put('/:id', authMiddleware, ReservationPaymentController.updateReservationPayment);
router.delete('/:id', authMiddleware, ReservationPaymentController.deleteReservationPayment);

export default router;
