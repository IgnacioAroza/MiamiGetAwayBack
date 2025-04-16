import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ReservationWithClient } from '../types/reservations.js';

export default class PdfService {
    static async generateInvoicePdf(reservation: ReservationWithClient): Promise<string> {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const fileName = `${reservation.id}-${reservation.clientLastname}-${reservation.clientName}.pdf`;
        const filePath = path.join(tempDir, fileName);
        
        const doc = new PDFDocument({
            margins: {
                top: 30,
                bottom: 30,
                left: 40,
                right: 40
            }
        });
        
        const stream = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
            doc.pipe(stream);
            this.addPdfContent(doc, reservation);
            doc.end();
        });
    }

    // Nuevo método para generar PDF y retornar como buffer para descarga directa
    static async generatePdfForDownload(reservation: ReservationWithClient): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                // Verificar campos críticos
                if (!reservation) {
                    reject(new Error('Invalid reservation data'));
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

    private static addPdfContent(doc: PDFKit.PDFDocument, reservation: ReservationWithClient): void {
        // Logo centrado
        const logoPath = path.join(process.cwd(), 'src', 'assets', 'images', 'logo_texto_negro.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 100, 30, {
                fit: [400, 100],
                align: 'center'
            });
        }

        // Dirección
        doc.fontSize(12)
           .text('1001 N Federal Hwy, Suite 252', 100, 120, {
               align: 'center',
               width: 400
           })
           .text('Hallandale Beach, FL  33009', {
               align: 'center',
               width: 400
           })
           .text('United States', {
               align: 'center',
               width: 400
           });

        // Datos de contacto
        doc.fontSize(12)
           .text('reservas@miami-getaway.com', 100, 170, {
               align: 'center',
               width: 400
           })
           .text('+1 (414) 339-3382', 100, 185, {
               align: 'center',
               width: 400
           })
           .text('+54 9 3564 503454', 100, 200, {
               align: 'center',
               width: 400
           });

        // Línea separadora superior
        doc.moveTo(40, 230).lineTo(570, 230).stroke();

        // Información de facturación
        doc.fontSize(12)
           .text('Bill To:', 40, 245)
           .text(`Invoice #: ${reservation.id}`, 450, 245);

        // Datos del cliente
        const clientName = reservation.clientName || 'No specified';
        const clientLastname = reservation.clientLastname || '';
        const clientEmail = reservation.clientEmail || 'No specified';
        const clientPhone = reservation.clientPhone || 'No specified';

        doc.fontSize(12)
           .text(`${clientName} ${clientLastname}`, 40, 260)
           .text(`Email: ${clientEmail}`, 40, 275)
           .text(`Phone: ${clientPhone}`, 40, 290);

        // Línea separadora después de los datos del cliente
        doc.moveTo(40, 310).lineTo(570, 310).stroke();

        // Encabezados de la tabla
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('DESCRIPTION', 40, 325)
           .text('AMOUNT', 470, 325, { align: 'right', width: 60 });

        // Contenido de la tabla
        doc.font('Helvetica')
           .fontSize(12);
        let yPos = 340;

        const nights = Number(reservation.nights) || 0;
        const pricePerNight = Number(reservation.pricePerNight) || 0;
        const cleaningFee = Number(reservation.cleaningFee) || 0;
        const parkingFee = Number(reservation.parkingFee) || 0;
        const otherExpenses = Number(reservation.otherExpenses) || 0;
        const taxes = Number(reservation.taxes) || 0;
        const totalAmount = Number(reservation.totalAmount) || 0;

        // Usar el nombre del apartamento si está disponible
        const apartmentName = reservation.apartmentName || 'Apartment';
        doc.text(`${apartmentName} $${pricePerNight} X ${nights} nights`, 40, yPos)
           .text(`$${(pricePerNight * nights).toFixed(2)}`, 470, yPos, { align: 'right', width: 60 });
        yPos += 20;

        if (cleaningFee > 0) {
            doc.text('Cleaning fee', 40, yPos)
               .text(`$${cleaningFee.toFixed(2)}`, 470, yPos, { align: 'right', width: 60 });
            yPos += 20;
        }

        if (parkingFee > 0) {
            doc.text('Parking fee', 40, yPos)
               .text(`$${parkingFee.toFixed(2)}`, 470, yPos, { align: 'right', width: 60 });
            yPos += 20;
        }

        if (otherExpenses > 0) {
            doc.text('Other expenses', 40, yPos)
               .text(`$${otherExpenses.toFixed(2)}`, 470, yPos, { align: 'right', width: 60 });
            yPos += 20;
        }

        doc.text('Taxes', 40, yPos)
           .text(`$${taxes.toFixed(2)}`, 470, yPos, { align: 'right', width: 60 });
        yPos += 30;

        // Línea separadora antes del total
        doc.moveTo(40, yPos).lineTo(570, yPos).stroke();
        yPos += 15;

        // Total
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('INVOICE TOTAL', 40, yPos)
           .text(`$${totalAmount.toFixed(2)}`, 470, yPos, { align: 'right', width: 60 });
        yPos += 30;

        // Terms & Conditions
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('Terms & Conditions', 40, yPos);
        yPos += 15;

        doc.font('Helvetica')
           .fontSize(12)
           .text(`Apartment Address: ${reservation.apartmentAddress || 'No specified'}`, 40, yPos);
        yPos += 15;

        doc.text(`Check in: ${this.formatDate(reservation.checkInDate)} at 4:00 pm`, 40, yPos)
           .text(`Check Out: ${this.formatDate(reservation.checkOutDate)} at 11:00 am`, 40, yPos + 15);
        yPos += 45;

        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('NOTE TO CONSIDER:', 40, yPos);
        yPos += 15;

        if (reservation.notes) {
            doc.font('Helvetica')
                .fontSize(12)
                .text(reservation.notes, 40, yPos);
        } else {
            doc.font('Helvetica')
                .fontSize(12)
                .text('No notes provided', 40, yPos);
        }
    }

    private static formatDate(date: any): string {
        if (!date) return 'No specified';
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid date';
            return dateObj.toLocaleDateString();
        } catch (error) {
            return 'Invalid date';
        }
    }
}
