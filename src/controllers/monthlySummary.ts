import { Request, Response } from 'express';
import MonthlySummaryService from '../services/monthlySummaryService.js';

export class MonthlySummaryController {
    static async getSalesVolume(req: Request, res: Response): Promise<void> {
        try {
            const { from, to, groupBy } = req.query as {
                from?: string; to?: string; groupBy?: string
            };

            if (!from || !to) {
                res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });
                return;
            }

            // Validar formato básico de fecha
            const fromDate = new Date(from);
            const toDate = new Date(to);
            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                res.status(400).json({ error: 'Invalid from or to date' });
                return;
            }

            const validGroups = ['day', 'month', 'year'] as const;
            const gb = (groupBy || 'month').toLowerCase();
            const useGroupBy = (validGroups as readonly string[]).includes(gb) ? gb as 'day'|'month'|'year' : 'month';

            const result = await MonthlySummaryService.getSalesVolume({ from, to, groupBy: useGroupBy });
            res.status(200).json(result);
        } catch (error) {
            console.error('Error getting sales volume:', error);
            res.status(500).json({ error: 'Error getting sales volume' });
        }
    }
    
    static async generateSummary(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.body;

            // Validar mes y año
            if (!month || !year) {
                res.status(400).json({ error: 'Month and year are required' });
                return;
            }

            if (month < 1 || month > 12) {
                res.status(400).json({ error: 'Month must be between 1 and 12' });
                return;
            }

            if (year < 2023) {
                res.status(400).json({ error: 'Year must be greater than 2023' });
                return;
            }

            // Generar resumen
            const summary = await MonthlySummaryService.generateMonthlySummary(month, year);

            res.status(200).json({
                message: 'Monthly summary generated successfully',
                summary
            });
        } catch (error) {
            console.error('Error generating summary:', error);
            res.status(500).json({ error: 'Error generating summary' });
        }
    }

    static async getSummaryDetails(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.params;

            // Validar mes y año
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (isNaN(monthNum) || isNaN(yearNum)) {
                res.status(400).json({ error: 'Invalid month or year' });
                return;
            }

            if (monthNum < 1 || monthNum > 12) {
                res.status(400).json({ error: 'Month must be between 1 and 12' });
                return;
            }

            // Obtener el resumen con detalles
            const summaryDetails = await MonthlySummaryService.getSummaryDetails(monthNum, yearNum);
            
            if (!summaryDetails) {
                res.status(404).json({ error: 'Summary not found' });
                return;
            }

            res.status(200).json(summaryDetails);
        } catch (error) {
            console.error('Error getting summary details:', error);
            res.status(500).json({ error: 'Error getting summary details' });
        }
    }

    static async generatePdf(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.params;

            // Validar mes y año
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (isNaN(monthNum) || isNaN(yearNum)) {
                res.status(400).json({ error: 'Invalid month or year' });
                return;
            }

            if (monthNum < 1 || monthNum > 12) {
                res.status(400).json({ error: 'Month must be between 1 and 12' });
                return;
            }

            // Generar el PDF
            const pdfBuffer = await MonthlySummaryService.generateSummaryPdf(monthNum, yearNum);
            
            // Configurar encabezados para la descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=resumen-mensual-${year}-${month}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            
            // Enviar el PDF
            res.status(200).send(pdfBuffer);
        } catch (error) {
            console.error('Error generating PDF:', error);
            res.status(500).json({ error: 'Error generating PDF' });
        }
    }

    static async sendSummaryEmail(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.params;
            
            // Validar mes y año
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (isNaN(monthNum) || isNaN(yearNum)) {
                res.status(400).json({ error: 'Invalid month or year' });
                return;
            }

            if (monthNum < 1 || monthNum > 12) {
                res.status(400).json({ error: 'Month must be between 1 and 12' });
                return;
            }

            const adminEmail = process.env.ADMIN_EMAIL
            if (!adminEmail) {
                res.status(400).json({ error: 'Admin email is not defined' });
                return;
            }

            // Enviar el resumen por email
            await MonthlySummaryService.sendSummaryByEmail(monthNum, yearNum, adminEmail);
            
            res.status(200).json({
                message: 'Monthly summary sent successfully'
            });
        } catch (error) {
            console.error('Error sending summary email:', error);
            res.status(500).json({ error: 'Error sending summary email' });
        }
    }
}
