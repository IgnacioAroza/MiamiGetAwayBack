import { Router } from 'express';
import AdminApartmentController from '../controllers/adminApartment.js';
import upload from '../middleware/uploadMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:id', AdminApartmentController.getApartmentById);
router.post('/', authMiddleware, upload.array('images', 30), AdminApartmentController.createApartment);
router.get('/', AdminApartmentController.getAllApartments);
router.put('/:id', authMiddleware, upload.array('images', 30), AdminApartmentController.updateApartment);
router.delete('/:id', authMiddleware, AdminApartmentController.deleteApartment);

export default router;

