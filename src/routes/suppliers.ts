import { Router } from 'express';
import { SupplierController, SupplierPaymentController } from '../controllers/suppliers.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

// --- Suppliers CRUD ---
router.get('/', authMiddleware, SupplierController.getAll);
router.get('/:id', authMiddleware, SupplierController.getById);
router.post('/', authMiddleware, SupplierController.create);
router.put('/:id', authMiddleware, SupplierController.update);
router.delete('/:id', authMiddleware, SupplierController.remove);

export default router;

// Separate router for supplier payments (mounted at /api/supplier-payments)
export const supplierPaymentsRouter = Router();

supplierPaymentsRouter.get(
    '/by-reservation-supplier/:reservationSupplierId',
    authMiddleware,
    SupplierPaymentController.getByReservationSupplier
);
supplierPaymentsRouter.post('/', authMiddleware, upload.array('receipt_images', 10), SupplierPaymentController.create);
supplierPaymentsRouter.put('/:id', authMiddleware, upload.array('receipt_images', 10), SupplierPaymentController.update);
supplierPaymentsRouter.delete('/:id', authMiddleware, SupplierPaymentController.remove);
