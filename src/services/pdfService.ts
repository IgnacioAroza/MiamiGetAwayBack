import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ReservationWithClient } from '../types/reservations.js';

export default class PdfService {
    static async generateInvoicePdf(reservation: ReservationWithClient): Promise<string> {
        // Crear directorio temporal si no existe
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        // Crear nombre de archivo único
        const filePath = path.join(tempDir, `reservation-${reservation.id}.pdf`);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            // Manejar eventos del stream
            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);

            // Pipe del PDF al archivo
            doc.pipe(stream);

            // Agregar contenido al PDF
            this.addPdfContent(doc, reservation);

            // Finalizar el PDF
            doc.end();
        });
    }

    // Nuevo método para generar PDF y retornar como buffer para descarga directa
    static async generatePdfForDownload(reservation: ReservationWithClient): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                // Verificar campos críticos
                if (!reservation) {
                    reject(new Error('Datos de reserva inválidos'));
                    return;
                }
                
                const doc = new PDFDocument();
                const buffers: Buffer[] = [];
                
                // Recoger los chunks en un array
                doc.on('data', (chunk) => {
                    buffers.push(Buffer.from(chunk));
                });
                
                // Manejar errores del documento
                doc.on('error', (error) => {
                    reject(error);
                });
                
                // Cuando termine, resolver con el buffer completo
                doc.on('end', () => {
                    try {
                        const pdfBuffer = Buffer.concat(buffers);
                        resolve(pdfBuffer);
                    } catch (error) {
                        reject(error);
                    }
                });
                
                // Agregar contenido al PDF
                this.addPdfContent(doc, reservation);
                
                // Finalizar el PDF
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Método para reutilizar la generación del contenido del PDF
    private static addPdfContent(doc: PDFKit.PDFDocument, reservation: ReservationWithClient): void {
        // Título
        doc.fontSize(20).text('Comprobante de Reserva', { align: 'center' });
        doc.moveDown();
        
        // ID de reserva
        const reservationId = reservation.id?.toString() || 'N/A';
        doc.fontSize(14).text(`Reservation #${reservationId}`, { align: 'center' });
        
        // Datos del cliente
        const clientName = reservation.clientName || 'No especificado';
        const clientLastname = reservation.clientLastname || '';
        const clientEmail = reservation.clientEmail || 'No especificado';
        const clientPhone = reservation.clientPhone || 'No especificado';
        doc.fontSize(12).text(`Client: ${clientName} ${clientLastname}`, { align: 'center' });
        doc.fontSize(12).text(`Email: ${clientEmail}`, { align: 'center' });
        doc.fontSize(12).text(`Phone: ${clientPhone}`, { align: 'center' });
        doc.moveDown();

        // Formatear fechas con validación para evitar errores si son undefined
        const formatDate = (date: any): string => {
            if (!date) return 'No especificada';
            try {
                // Verificar si la fecha es válida
                const dateObj = new Date(date);
                if (isNaN(dateObj.getTime())) return 'Fecha inválida';
                return dateObj.toLocaleDateString();
            } catch (error) {
                return 'Fecha inválida';
            }
        };
        
        // Procesar fechas
        const checkInDateFormatted = formatDate(reservation.checkInDate);
        const checkOutDateFormatted = formatDate(reservation.checkOutDate);

        // Agregar detalles de la reserva con validación para cada campo
        doc.fontSize(12).text(`Check-in: ${checkInDateFormatted}`);
        doc.fontSize(12).text(`Check-out: ${checkOutDateFormatted}`);
        
        // Procesar valores numéricos
        const nights = reservation.nights || 0;
        const pricePerNight = reservation.pricePerNight || 0;
        const cleaningFee = reservation.cleaningFee || 0;
        const otherExpenses = reservation.otherExpenses || 0;
        const taxes = reservation.taxes || 0;
        const totalAmount = reservation.totalAmount || 0;
        const amountPaid = reservation.amountPaid || 0;
        const amountDue = reservation.amountDue || 0;
        
        doc.fontSize(12).text(`Nights: ${nights}`);
        doc.moveDown();
        doc.fontSize(12).text(`Price per night: $${pricePerNight}`);
        doc.fontSize(12).text(`Cleaning fee: $${cleaningFee}`);
        doc.fontSize(12).text(`Other expenses: $${otherExpenses}`);
        doc.fontSize(12).text(`Taxes: $${taxes}`);
        doc.fontSize(12).text(`Total: $${totalAmount}`);
        doc.moveDown();
        doc.fontSize(12).text(`Paid: $${amountPaid}`);
        doc.fontSize(12).text(`Pending: $${amountDue}`);
        
        // Procesar estados
        const status = reservation.status || 'No especificado';
        const paymentStatus = reservation.paymentStatus || 'No especificado';
        doc.fontSize(12).text(`Status: ${status}`);
        doc.fontSize(12).text(`Payment status: ${paymentStatus}`);
    }
}
