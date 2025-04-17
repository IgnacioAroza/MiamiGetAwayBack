// src/routes/monthlySummary.ts
import express from 'express';
import { MonthlySummaryController } from '../controllers/monthlySummary.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Generar un nuevo resumen mensual
router.post('/generate', authMiddleware, MonthlySummaryController.generateSummary);

// Obtener detalles de un resumen específico
router.get('/:year/:month', authMiddleware, MonthlySummaryController.getSummaryDetails);

// Generar y descargar PDF del resumen
router.get('/:year/:month/pdf', authMiddleware, MonthlySummaryController.generatePdf);

// Enviar resumen por email
router.post('/:year/:month/send', authMiddleware, MonthlySummaryController.sendSummaryEmail);

export default router;