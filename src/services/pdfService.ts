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
            doc.fontSize(20).text('Comprobante de Reserva', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Reserva #${reservation.id}`, { align: 'center' });
            doc.fontSize(12).text(`Cliente: ${reservation.clientName}`, { align: 'center' });
            doc.fontSize(12).text(`Email: ${reservation.clientEmail}`, { align: 'center' });
            doc.fontSize(12).text(`Teléfono: ${reservation.clientPhone}`, { align: 'center' });
            doc.moveDown();

            // Agregar detalles de la reserva
            doc.fontSize(12).text(`Check-in: ${reservation.checkInDate.toLocaleDateString()}`);
            doc.fontSize(12).text(`Check-out: ${reservation.checkOutDate.toLocaleDateString()}`);
            doc.fontSize(12).text(`Noches: ${reservation.nights}`);
            doc.moveDown();
            doc.fontSize(12).text(`Precio por noche: ${reservation.pricePerNight}`);
            doc.fontSize(12).text(`Limpieza: ${reservation.cleaningFee}`);
            doc.fontSize(12).text(`Otros gastos: ${reservation.otherExpenses}`);
            doc.fontSize(12).text(`Impuestos: ${reservation.taxes}`);
            doc.fontSize(12).text(`Total: ${reservation.totalAmount}`);
            doc.moveDown();
            doc.fontSize(12).text(`Pagado: ${reservation.amountPaid}`);
            doc.fontSize(12).text(`Pendiente: ${reservation.amountDue}`);
            doc.fontSize(12).text(`Estatus: ${reservation.status}`);
            doc.fontSize(12).text(`Estatus de pago: ${reservation.paymentStatus}`);

            // Finalizar el PDF
            doc.end();
        });
    }
}
