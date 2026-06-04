import { Router } from 'express';
import ExperienceController from '../controllers/experience.js';
import upload from '../middleware/uploadMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Experience CRUD
router.get('/', ExperienceController.getAll);
router.get('/inquiries', authMiddleware, ExperienceController.getAllInquiries);
router.get('/:id', ExperienceController.getById);
router.post('/', authMiddleware, upload.array('images', 30), ExperienceController.create);
router.put('/:id', authMiddleware, upload.array('images', 30), ExperienceController.update);
router.delete('/:id', authMiddleware, ExperienceController.delete);

// Inquiries
router.post('/inquiries', ExperienceController.createInquiry);
router.patch('/inquiries/:id', authMiddleware, ExperienceController.updateInquiryStatus);

export default router;
