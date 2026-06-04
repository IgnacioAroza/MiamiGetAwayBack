import { Router } from 'express';
import InvestmentController from '../controllers/investment.js';
import upload from '../middleware/uploadMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', InvestmentController.getAll);
router.get('/:id', InvestmentController.getById);
router.post('/', authMiddleware, upload.array('images', 30), InvestmentController.create);
router.put('/:id', authMiddleware, upload.array('images', 30), InvestmentController.update);
router.delete('/:id', authMiddleware, InvestmentController.delete);

export default router;
