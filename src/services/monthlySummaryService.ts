import { MonthlySummaryModel } from '../models/monthlySummary.js';
import PdfService from './pdfService.js';
import EmailService from './emailService.js';
import { MonthlySummary } from '../types/monthlySummary.js';
import { validateMonthlySummary } from '../schemas/monthlySummary.js';

export default class MonthlySummaryService {
   static async generateMonthlySummary(month: number, year: number): Promise<MonthlySummary>
    {
        try {
            // Obtener datos del mes
            const reservations = await MonthlySummaryModel.getReservationsByMonth(month, year);
            const payments = await MonthlySummaryModel.getPaymentsByMonth(month, year);

            // Calcular totales
            const totalReservations = reservations.length;
            const totalPayments = payments.length;

            // Asegurarnos de que los montos sean números y sumarlos correctamente
            const totalRevenue = payments.reduce((sum, payment) => {
                const amount = Number(payment.amount) || 0;
                return sum + amount;
            }, 0);

            // Verificar si el resumen ya existe
            const existingSummary = await MonthlySummaryModel.getSummaryByMonthAndYear(month, year);

            if (existingSummary) {
                // Actualizar resumen existente
                return await MonthlySummaryModel.updateSummary(existingSummary.id, {
                    totalReservations,
                    totalPayments,
                    totalRevenue
                });
            } else {
                // Crear nuevo resumen
                const summaryData = {
                    month,
                    year,
                    totalReservations,
                    totalPayments,
                    totalRevenue
                };

                // Validar los datos antes de crear
                const validation = validateMonthlySummary(summaryData);
                if (!validation.success) {
                    throw new Error('Invalid summary data');
                }

                return await MonthlySummaryModel.createSummary(summaryData);
            }
        } catch (error) {
            throw error;
        }
    }

    static async getSalesVolume(params: { from: string; to: string; groupBy: 'day'|'month'|'year' }) {
        try {
            const { from, to, groupBy } = params;
            const rows = await MonthlySummaryModel.getSalesVolume({ from, to, groupBy });

            // Normalizar period a ISO string
            const series = rows.map((r: any) => ({
                period: typeof r.period === 'string' ? r.period : new Date(r.period).toISOString(),
                totalRevenue: Number(r.totalRevenue) || 0,
                totalPayments: Number(r.totalPayments) || 0,
            }));

            const totals = series.reduce((acc, cur) => {
                acc.totalRevenue += cur.totalRevenue;
                acc.totalPayments += cur.totalPayments;
                return acc;
            }, { totalRevenue: 0, totalPayments: 0 });

            return { from, to, groupBy, series, totals };
        } catch (error) {
            throw error;
        }
    }
    
    static async generateSummaryPdf(month: number, year: number): Promise<Buffer> {
        try {
            // Obtener datos detallados
            const reservations = await MonthlySummaryModel.getReservationsByMonth(month, year);
            const payments = await MonthlySummaryModel.getPaymentsByMonth(month, year);

            // Calcular totales
            const totalReservations = reservations.length;
            const totalPayments = payments.length;
            const totalRevenue = payments.reduce((sum, payment) => {
                const amount = Number(payment.amount) || 0;
                return sum + amount;
            }, 0);

            // Crear o actualizar el resumen
            let summary = await MonthlySummaryModel.getSummaryByMonthAndYear(month, year);
            
            if (summary) {
                // Actualizar el resumen existente
                summary = await MonthlySummaryModel.updateSummary(summary.id, {
                    totalReservations,
                    totalPayments,
                    totalRevenue
                });
            } else {
                // Crear nuevo resumen
                const summaryData = {
                    month,
                    year,
                    totalReservations,
                    totalPayments,
                    totalRevenue
                };

                summary = await MonthlySummaryModel.createSummary(summaryData);
            }

            // Generar PDF
            return await PdfService.generateMonthlySummaryPdf(summary, reservations, payments);
        } catch (error) {
            throw error;
        }
    }

    static async sendSummaryByEmail(month: number, year: number, email: string): Promise<void> {
        try {
            // Generar PDF
            const pdfBuffer = await this.generateSummaryPdf(month, year);
            
            // Enviar email
            await EmailService.sendMonthlySummaryEmail(email, pdfBuffer, month, year);
        } catch (error) {
            console.error('Error sending summary by email:', error);
            throw error;
        }
    }

    static async getSummaryDetails(month: number, year: number) {
        try {
            // Obtener el resumen
            const summary = await MonthlySummaryModel.getSummaryByMonthAndYear(month, year);
            if (!summary) {
                throw new Error('Summary not found');
            }

            // Obtener datos detallados
            const reservations = await MonthlySummaryModel.getReservationsByMonth(month, year);
            const payments = await MonthlySummaryModel.getPaymentsByMonth(month, year);

            return {
                summary,
                reservations,
                payments
            };
        } catch (error) {
            throw error;
        }
    }
}
