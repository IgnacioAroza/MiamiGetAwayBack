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
        // Logo y encabezado
        const logoPath = path.join(process.cwd(), 'src', 'assets', 'images', 'shadowLogo.jpg');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 30, {
                fit: [150, 150]
            });
        }

        // Título centrado
        doc.font('Helvetica')
           .fontSize(20)
           .text('Miami Get Away', 100, 50, {
               align: 'center',
               width: 400
           });

        // Dirección
        doc.fontSize(12)
           .text('2127 Brickell Av 1204', 100, 80, {
               align: 'center',
               width: 400
           })
           .text('Miami Florida 33129', {
               align: 'center',
               width: 400
           });

        // Línea separadora superior
        doc.moveTo(40, 160).lineTo(570, 160).stroke();

        // Información de facturación
        doc.fontSize(12)
           .text('Bill To:', 40, 180)
           .text(`Invoice #: ${reservation.id}`, 450, 180);

        // Datos del cliente
        const clientName = reservation.clientName || 'No specified';
        const clientLastname = reservation.clientLastname || '';
        const clientEmail = reservation.clientEmail || 'No specified';
        const clientPhone = reservation.clientPhone || 'No specified';

        doc.fontSize(12)
           .text(`${clientName} ${clientLastname}`, 40, 195)
           .text(`Email: ${clientEmail}`, 40, 210)
           .text(`Phone: ${clientPhone}`, 40, 225);

        // Línea separadora después de los datos del cliente
        doc.moveTo(40, 245).lineTo(570, 245).stroke();

        // Encabezados de la tabla
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('DESCRIPTION', 40, 255)
           .text('AMOUNT', 470, 255, { align: 'right', width: 60 });

        // Contenido de la tabla
        doc.font('Helvetica')
           .fontSize(12);
        let yPos = 270;

        const nights = reservation.nights || 0;
        const pricePerNight = reservation.pricePerNight || 0;
        const cleaningFee = reservation.cleaningFee || 0;
        const parkingFee = reservation.parkingFee || 0;
        const otherExpenses = reservation.otherExpenses || 0;
        const taxes = reservation.taxes || 0;
        const totalAmount = reservation.totalAmount || 0;

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
           .text(`Check in: ${this.formatDate(reservation.checkInDate)} at 4:00 pm`, 40, yPos)
           .text(`Check Out: ${this.formatDate(reservation.checkOutDate)} at 11:00 am`, 40, yPos + 15);
        yPos += 45;

        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text('NOTA A TENER EN CUENTA:', 40, yPos);
        yPos += 15;

        doc.font('Helvetica')
           .fontSize(12)
           .text('Al ingresar les pedirán un depósito de seguridad', 40, yPos)
           .text('de $150 con tarjeta reembolsable al final de la estadía.', 40, yPos + 15);
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
