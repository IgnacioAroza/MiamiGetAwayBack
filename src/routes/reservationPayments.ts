import { Router } from 'express';
import { ReservationPaymentController } from '../controllers/reservationPayments.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', authMiddleware, ReservationPaymentController.getAllReservationPayments);
router.get('/:id', authMiddleware, ReservationPaymentController.getReservationPaymentById);
router.post('/', authMiddleware, upload.single('receipt_image'), ReservationPaymentController.createReservationPayment);
router.put('/:id', authMiddleware, upload.single('receipt_image'), ReservationPaymentController.updateReservationPayment);
router.delete('/:id', authMiddleware, ReservationPaymentController.deleteReservationPayment);

export default router;
