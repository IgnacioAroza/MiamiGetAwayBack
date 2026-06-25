import { Request, Response } from 'express';
import MonthlySummaryService from '../services/monthlySummaryService.js';
import { ok, badRequest, notFound, serverError } from '../utils/response.js';

export class MonthlySummaryController {
    static async getSalesVolume(req: Request, res: Response): Promise<void> {
        try {
            const { from, to, groupBy } = req.query as {
                from?: string; to?: string; groupBy?: string
            };

            if (!from || !to) {
                badRequest(res, 'from and to are required (YYYY-MM-DD)');
                return;
            }

            const fromDate = new Date(from);
            const toDate = new Date(to);
            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                badRequest(res, 'Invalid from or to date');
                return;
            }

            const validGroups = ['day', 'month', 'year'] as const;
            const gb = (groupBy || 'month').toLowerCase();
            const useGroupBy = (validGroups as readonly string[]).includes(gb) ? gb as 'day'|'month'|'year' : 'month';

            const result = await MonthlySummaryService.getSalesVolume({ from, to, groupBy: useGroupBy });
            ok(res, result);
        } catch (error) {
            console.error('Error getting sales volume:', error);
            serverError(res, 'Error getting sales volume');
        }
    }

    static async generateSummary(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.body;

            if (!month || !year) {
                badRequest(res, 'Month and year are required');
                return;
            }

            if (month < 1 || month > 12) {
                badRequest(res, 'Month must be between 1 and 12');
                return;
            }

            if (year < 2023) {
                badRequest(res, 'Year must be greater than 2023');
                return;
            }

            const summary = await MonthlySummaryService.generateMonthlySummary(month, year);

            ok(res, { message: 'Monthly summary generated successfully', summary });
        } catch (error) {
            console.error('Error generating summary:', error);
            serverError(res, 'Error generating summary');
        }
    }

    static async getSummaryDetails(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.params;

            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (isNaN(monthNum) || isNaN(yearNum)) {
                badRequest(res, 'Invalid month or year');
                return;
            }

            if (monthNum < 1 || monthNum > 12) {
                badRequest(res, 'Month must be between 1 and 12');
                return;
            }

            const summaryDetails = await MonthlySummaryService.getSummaryDetails(monthNum, yearNum);

            if (!summaryDetails) {
                notFound(res, 'Summary not found');
                return;
            }

            ok(res, summaryDetails);
        } catch (error) {
            console.error('Error getting summary details:', error);
            serverError(res, 'Error getting summary details');
        }
    }

    static async generatePdf(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.params;

            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (isNaN(monthNum) || isNaN(yearNum)) {
                badRequest(res, 'Invalid month or year');
                return;
            }

            if (monthNum < 1 || monthNum > 12) {
                badRequest(res, 'Month must be between 1 and 12');
                return;
            }

            const pdfBuffer = await MonthlySummaryService.generateSummaryPdf(monthNum, yearNum);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=resumen-mensual-${year}-${month}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.status(200).send(pdfBuffer);
        } catch (error) {
            console.error('Error generating PDF:', error);
            serverError(res, 'Error generating PDF');
        }
    }

    static async sendSummaryEmail(req: Request, res: Response): Promise<void> {
        try {
            const { month, year } = req.params;

            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (isNaN(monthNum) || isNaN(yearNum)) {
                badRequest(res, 'Invalid month or year');
                return;
            }

            if (monthNum < 1 || monthNum > 12) {
                badRequest(res, 'Month must be between 1 and 12');
                return;
            }

            const adminEmail = process.env.ADMIN_EMAIL
            if (!adminEmail) {
                badRequest(res, 'Admin email is not defined');
                return;
            }

            await MonthlySummaryService.sendSummaryByEmail(monthNum, yearNum, adminEmail);

            ok(res, { message: 'Monthly summary sent successfully' });
        } catch (error) {
            console.error('Error sending summary email:', error);
            serverError(res, 'Error sending summary email');
        }
    }
}
