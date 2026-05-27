import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.js';
import { ReservationSupplierController } from '../controllers/suppliers.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', authMiddleware, ReservationController.getAllReservations);
router.get('/:id', authMiddleware, ReservationController.getReservationById);
router.post('/', authMiddleware, ReservationController.createReservation);
router.put('/:id', authMiddleware, ReservationController.updateReservation);
router.patch('/:id', authMiddleware, ReservationController.updateReservation);
router.delete('/:id', authMiddleware, ReservationController.deleteReservation);

router.post('/:id/payments', authMiddleware, upload.single('receipt_image'), ReservationController.registerPayment);
router.post('/:id/pdf', authMiddleware, ReservationController.generatePdf);
router.get('/:id/pdf/download', authMiddleware, ReservationController.downloadPdf);

router.get('/:id/payments', authMiddleware, ReservationController.getReservationPayments);

// Ruta para actualizar el estado de pago de una reserva
router.patch('/:id/payment-status', authMiddleware, ReservationController.updatePaymentStatus);

// Ruta para enviar notificación por email al cliente
router.post('/:id/send-notification', authMiddleware, ReservationController.sendNotification);

// Supplier assignment for a reservation
router.get('/:id/supplier', authMiddleware, ReservationSupplierController.get);
router.post('/:id/supplier', authMiddleware, ReservationSupplierController.assign);
router.put('/:id/supplier', authMiddleware, ReservationSupplierController.update);
router.delete('/:id/supplier', authMiddleware, ReservationSupplierController.unassign);
router.patch('/:id/supplier-status', authMiddleware, ReservationSupplierController.setStatus);

// Supplier payments nested under reservation
router.get('/:id/supplier/payments', authMiddleware, ReservationSupplierController.getPayments);
router.post('/:id/supplier/payments', authMiddleware, upload.array('receipt_images', 10), ReservationSupplierController.createPayment);

export default router;
