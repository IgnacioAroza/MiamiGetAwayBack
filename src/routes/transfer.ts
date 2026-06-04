import { Router } from 'express';
import TransferController from '../controllers/transfer.js';
import upload from '../middleware/uploadMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Vehicles CRUD
router.get('/vehicles', TransferController.getAllVehicles);
router.get('/vehicles/:id', TransferController.getVehicleById);
router.post('/vehicles', authMiddleware, upload.array('images', 30), TransferController.createVehicle);
router.put('/vehicles/:id', authMiddleware, upload.array('images', 30), TransferController.updateVehicle);
router.delete('/vehicles/:id', authMiddleware, TransferController.deleteVehicle);

// Inquiries
router.post('/inquiries', TransferController.createInquiry);
router.get('/inquiries', authMiddleware, TransferController.getAllInquiries);
router.patch('/inquiries/:id', authMiddleware, TransferController.updateInquiryStatus);

export default router;
