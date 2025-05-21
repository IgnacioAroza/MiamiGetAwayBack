import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ReservationWithClient } from '../types/reservations.js';
import { MonthlySummary } from '../types/monthlySummary.js';
import { ReservationPayment } from '../types/reservationPayments.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class PdfService {
    static async generateInvoicePdf(reservation: ReservationWithClient, payments: ReservationPayment[] = []): Promise<string> {
        // Comentamos la parte de logs
        /*const logFile = path.join(process.cwd(), 'pdf-debug.log');
        const writeLog = (message: string) => {
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
        };

        writeLog('Starting PDF generation...');*/
        
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
            },
            size: 'A4'
        });

        const stream = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                //writeLog('PDF generation completed: ' + filePath);
                resolve(filePath);
            });
            stream.on('error', (error) => {
                //writeLog('Stream error: ' + error.message);
                reject(error);
            });

            try {
                doc.pipe(stream);
                
                // Agregar imagen de fondo
                this.addBackgroundImage(doc);
                
                // Agregar contenido al PDF
                this.addPdfContent(doc, reservation, payments);
                
                doc.end();
                //writeLog('Document ended successfully');
            } catch (error: unknown) {
                if (error instanceof Error) {
                    //writeLog('Error during PDF generation: ' + error.message);
                    reject(error);
                }
            }
        });
    }

    // Nuevo método para generar PDF y retornar como buffer para descarga directa
    static async generatePdfForDownload(reservation: ReservationWithClient, payments: ReservationPayment[] = []): Promise<Buffer> {
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

                // Agregar imagen de fondo
                this.addBackgroundImage(doc);
                
                // Agregar contenido al PDF
                this.addPdfContent(doc, reservation, payments);
                
                // Finalizar el PDF
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    private static addPdfContent(doc: PDFKit.PDFDocument, reservation: ReservationWithClient, payments: ReservationPayment[] = []): void {
        // --- Imagen de fondo en todas las páginas, incluso en saltos automáticos ---
        doc.on('pageAdded', () => {
            PdfService.addBackgroundImage(doc);
        });
        PdfService.addBackgroundImage(doc); // Para la primera página

        // Logo centrado
        const logoPath = path.join(__dirname, '..', 'assets', 'images', 'logo_sin_fondo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 100, 30, {
                fit: [400, 100],
                align: 'center'
            });
        }

        // Configuración de la posición inicial después del logo
        const startY = 150;
        const leftMargin = 80; // Solo para la sección del encabezado
        const rightMargin = 570;
        const pageCenter = (rightMargin + leftMargin) / 2;
        const rightColumnStart = pageCenter + 70;
        const iconSize = 15;

        // Cambiar el color del texto a blanco
        doc.fillColor('white');

        // Primera línea de información
        doc.fontSize(10);
        
        // Dirección (izquierda)
        const locationIcon = path.join(__dirname, '..', 'assets', 'icons', 'location.png');
        if (fs.existsSync(locationIcon)) {
            doc.image(locationIcon, leftMargin, startY, { width: iconSize, height: iconSize });
        }
        doc.text('1001 N Federal Hwy, Suite 252, Hallandale Beach, FL 33009', 
                leftMargin + 20, startY, 
                { width: pageCenter - leftMargin - 40 });

        // Teléfonos (derecha)
        const phoneText = '+1 (414) 339-3382\n+54 9 3564 503454';
        const phoneIcon = path.join(__dirname, '..', 'assets', 'icons', 'phone.png');
        if (fs.existsSync(phoneIcon)) {
            doc.image(phoneIcon, rightColumnStart, startY, { width: iconSize, height: iconSize });
        }
        doc.text(phoneText, 
                rightColumnStart + 20, startY,
                { width: rightMargin - rightColumnStart - 20 });

        // Segunda línea de información
        const startY2 = startY + 30;

        // Email (izquierda)
        const emailIcon = path.join(__dirname, '..', 'assets', 'icons', 'email.png');
        if (fs.existsSync(emailIcon)) {
            doc.image(emailIcon, leftMargin, startY2, { width: iconSize, height: iconSize });
        }
        doc.text('reservas@miami-getaway.com',
                leftMargin + 20, startY2,
                { width: pageCenter - leftMargin - 40 });

        // Sitio web (derecha)
        const webText = 'www.miami-getaway.com';
        const webIcon = path.join(__dirname, '..', 'assets', 'icons', 'web.png');
        if (fs.existsSync(webIcon)) {
            doc.image(webIcon, rightColumnStart, startY2, { width: iconSize, height: iconSize });
        }
        doc.text(webText,
                rightColumnStart + 20, startY2,
                { width: rightMargin - rightColumnStart - 20 });

        // Línea separadora superior
        doc.strokeColor('white');
        doc.moveTo(40, 230).lineTo(570, 230).stroke();

        // Títulos de sección
        doc.font('Helvetica-Bold')
           .fontSize(14)
           .fillColor('white')
           .text('Reservation Details', 40, 245)
           .text('RESERVATION', 350, 245);

        // Restaurar color para el contenido normal
        doc.fillColor('white');
        
        // Contenido de la columna izquierda
        doc.font('Helvetica')
           .fontSize(10);
        
        // Detalles de la reserva (izquierda)
        let yPos = 275;
        const labelWidth = 80;
        
        doc.text('Check-in', 40, yPos);
        doc.text(this.formatDate(reservation.checkInDate), 40 + labelWidth, yPos);
        yPos += 20;

        doc.text('Check-out', 40, yPos);
        doc.text(this.formatDate(reservation.checkOutDate), 40 + labelWidth, yPos);
        yPos += 20;

        doc.text('Apartment', 40, yPos);
        doc.text(reservation.apartmentName || 'Not specified', 40 + labelWidth, yPos);
        yPos += 30;

        // Información de reserva (derecha)
        const rightColumn = 350;
        yPos = 275;

        doc.text('Reservation #', rightColumn, yPos);
        doc.text(reservation.id.toString().padStart(5, '0'), rightColumn + labelWidth, yPos);
        yPos += 20;

        doc.text('Reservation date', rightColumn, yPos);
        doc.text(this.formatDate(reservation.createdAt), rightColumn + labelWidth, yPos);
        yPos += 20;

        doc.text('Status', rightColumn, yPos);
        doc.text(this.getStatusInEnglish(reservation.status) || 'Confirmed', rightColumn + labelWidth, yPos);
        yPos += 30;

        // Información del cliente
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('white')
           .text('Reserved By', 40, yPos);
        yPos += 20;

        const clientName = reservation.clientName || 'No specified';
        const clientLastname = reservation.clientLastname || '';
        const clientEmail = reservation.clientEmail || 'No specified';

        doc.font('Helvetica')
           .fillColor('white')
           .fontSize(10)
           .text(`${clientName} ${clientLastname}`, 40, yPos)
           .text(clientEmail, 40, yPos + 15);
        yPos += 45;

        // Línea separadora después de los datos del cliente
        doc.strokeColor('white');
        doc.moveTo(40, yPos).lineTo(570, yPos).stroke();

        // Definir las posiciones de las columnas
        const colX = {
            description: 40,
            quantity: 250,
            unitPrice: 350,
            amount: 470,
            endX: 570
        };

        // Altura de la fila del encabezado
        const headerHeight = 25;
        const startYHeader = yPos + 10;

        // Color de fondo para el encabezado
        doc.rect(colX.description, startYHeader, colX.endX - colX.description, headerHeight).fill('#1B4B82');
        
        // Texto del encabezado en blanco
        doc.fillColor('white')
           .font('Helvetica-Bold')
           .fontSize(12)
           .text('Items', colX.description + 5, startYHeader + 5)
           .text('Quantity', colX.quantity + 5, startYHeader + 5)
           .text('Unit Price', colX.unitPrice, startYHeader + 5, { align: 'right', width: 100 })
           .text('Amount', colX.amount, startYHeader + 5, { align: 'right', width: 60 });

        // Restaurar el color del texto a blanco para el contenido
        doc.fillColor('white');
        
        // Iniciar posición Y para el contenido
        yPos = startYHeader + headerHeight;
        let currentY = yPos;
        
        // Función helper para dibujar línea horizontal
        const drawHorizontalLine = (atY: number) => {
            doc.strokeColor('white').lineWidth(1);
            doc.moveTo(colX.description, atY).lineTo(colX.endX, atY).stroke();
        };

        // Contenido de la tabla
        doc.font('Helvetica')
           .fontSize(12);

        // Noches
        const nights = Number(reservation.nights) || 0;
        const pricePerNight = Number(reservation.pricePerNight) || 0;
        doc.text('Nights', colX.description + 5, currentY + 5)
           .text(nights.toString(), colX.quantity + 5, currentY + 5)
           .text(`$${pricePerNight.toFixed(2)}`, colX.unitPrice, currentY + 5, { align: 'right', width: 100 })
           .text(`$${(pricePerNight * nights).toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
        currentY += 20;
        drawHorizontalLine(currentY);

        // Cleaning fee
        if (reservation.cleaningFee > 0) {
            const cleaningFee = Number(reservation.cleaningFee) || 0;
            doc.text('Cleaning fee', colX.description + 5, currentY + 5)
               .text('1.00', colX.quantity + 5, currentY + 5)
               .text(`$${cleaningFee.toFixed(2)}`, colX.unitPrice, currentY + 5, { align: 'right', width: 100 })
               .text(`$${cleaningFee.toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
            currentY += 20;
            drawHorizontalLine(currentY);
        }

        // Parking fee
        if (reservation.parkingFee > 0) {
            const parkingFee = Number(reservation.parkingFee) || 0;
            doc.text('Parking fee', colX.description + 5, currentY + 5)
               .text('1.00', colX.quantity + 5, currentY + 5)
               .text(`$${parkingFee.toFixed(2)}`, colX.unitPrice, currentY + 5, { align: 'right', width: 100 })
               .text(`$${parkingFee.toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
            currentY += 20;
            drawHorizontalLine(currentY);
        }

        // Other expenses
        if (reservation.otherExpenses > 0) {
            const otherExpenses = Number(reservation.otherExpenses) || 0;
            doc.text('Other expenses', colX.description + 5, currentY + 5)
               .text('1.00', colX.quantity + 5, currentY + 5)
               .text(`$${otherExpenses.toFixed(2)}`, colX.unitPrice, currentY + 5, { align: 'right', width: 100 })
               .text(`$${otherExpenses.toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
            currentY += 20;
            drawHorizontalLine(currentY);
        }

        // Subtotal
        currentY += 5;
        const subtotal = Number(nights * pricePerNight) + 
                        Number(reservation.cleaningFee || 0) + 
                        Number(reservation.parkingFee || 0) + 
                        Number(reservation.otherExpenses || 0);
        
        doc.font('Helvetica-Bold')
           .fillColor('white')
           .text('Subtotal', colX.unitPrice, currentY + 5);
        doc.font('Helvetica')
           .fillColor('white')
           .text(`$${subtotal.toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
        currentY += 20;

        // Taxes
        if (reservation.taxes > 0) {
            const taxes = Number(reservation.taxes || 0);
            doc.font('Helvetica-Bold')
               .fillColor('white')
               .text('Taxes', colX.unitPrice, currentY + 5);
            doc.font('Helvetica')
               .fillColor('white')
               .text(`$${taxes.toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
            currentY += 20;
        }

        // Total
        drawHorizontalLine(currentY);
        currentY += 5;
        const totalAmount = Number(reservation.totalAmount || 0);
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('white')
           .text('TOTAL', colX.unitPrice, currentY + 5);
        doc.fillColor('white')
           .text(`$${totalAmount.toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
        currentY += 30;
        // Pagos como filas adicionales en la misma tabla de ítems, con salto de página y encabezado si es necesario
        const pageHeight = doc.page.height;
        const bottomMargin = 30;
        const rowHeight = 20;
        const drawTableHeader = (y: number) => {
            // Fondo azul para encabezado
            doc.rect(colX.description, y, colX.endX - colX.description, headerHeight).fill('#1B4B82');
            doc.fillColor('white')
                .font('Helvetica-Bold').fontSize(12)
                .text('Items', colX.description + 5, y + 5)
                .text('Quantity', colX.quantity + 5, y + 5)
                .text('Unit Price', colX.unitPrice, y + 5, { align: 'right', width: 100 })
                .text('Amount', colX.amount, y + 5, { align: 'right', width: 60 });
        };
        if (payments && payments.length > 0) {
            doc.font('Helvetica-Bold').fontSize(12).fillColor('white');
            payments.forEach(payment => {
                // Si la siguiente fila se pasa de página, agregar página y encabezado
                if (currentY + rowHeight + bottomMargin > pageHeight) {
                    doc.addPage();
                    currentY = 40; // margen superior
                    drawTableHeader(currentY);
                    currentY += headerHeight;
                }
                const formattedDate = this.formatDate(payment.paymentDate).split(' ')[0];
                doc.text('Payment', colX.description + 5, currentY + 5)
                   .text(formattedDate, colX.quantity + 5, currentY + 5)
                   .text(payment.paymentMethod || '-', colX.unitPrice, currentY + 5, { align: 'right', width: 100 })
                   .text(`$${Number(payment.amount).toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
                currentY += rowHeight;
                drawHorizontalLine(currentY);
            });
        }
        // Monto adeudado como fila final, también con salto de página si es necesario
        if (currentY + rowHeight + bottomMargin > pageHeight) {
            doc.addPage();
            currentY = 40;
            drawTableHeader(currentY);
            currentY += headerHeight;
        }
        doc.font('Helvetica-Bold').fontSize(12).fillColor('white')
            .text('Amount Due', colX.unitPrice, currentY + 5)
            .text(`$${Number(reservation.amountDue || 0).toFixed(2)}`, colX.amount, currentY + 5, { align: 'right', width: 60 });
        currentY += 25;
        yPos = currentY;

        // --- Salto de página para la sección inferior si no hay suficiente espacio ---
        const minSpaceForBottom = 120; // espacio mínimo para Terms, Address, Notes, etc.
        if (yPos + minSpaceForBottom > doc.page.height - bottomMargin) {
            doc.addPage();
            yPos = 40;
        }

        // Terms & Conditions
        const apartmentAddress = reservation.apartmentAddress || 'Not specified';
        const apartmentDescription = reservation.apartmentDescription || 'Not specified';

        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('white')
           .text('Terms & Conditions', 40, yPos);
        yPos += 15;

        doc.font('Helvetica')
           .fillColor('white')
           .text(`Apartment Address: ${apartmentAddress}`, 40, yPos);
        yPos += 15;
        doc.font('Helvetica')
           .fillColor('white')
           .text(`Apartment Description: ${apartmentDescription}`, 40, yPos);
        yPos += 45;

        // --- Cálculo de altura de las notas y salto de página si es necesario ---
        doc.font('Helvetica-Bold').fontSize(12);
        const notesTitle = 'NOTES TO CONSIDER:';
        const notesContent = reservation.notes ? reservation.notes : 'No notes provided';
        const notesFontSize = 12;
        const notesFont = 'Helvetica';
        // Calcular altura del título y del contenido
        const notesTitleHeight = doc.heightOfString(notesTitle, { width: 500, align: 'left' });
        doc.font(notesFont).fontSize(notesFontSize);
        const notesContentHeight = doc.heightOfString(notesContent, { width: 500, align: 'left' });
        const totalNotesHeight = notesTitleHeight + 5 + notesContentHeight + 10;
        if (yPos + totalNotesHeight > doc.page.height - bottomMargin) {
            doc.addPage();
            yPos = 40;
        }
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('white')
           .text(notesTitle, 40, yPos);
        yPos += notesTitleHeight + 5;
        doc.font(notesFont)
           .fillColor('white')
           .fontSize(notesFontSize)
           .text(notesContent, 40, yPos, { width: 500, align: 'left' });
    }

    static async generateMonthlySummaryPdf(
        summary: MonthlySummary,
        reservations: any[],
        payments: any[]
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const buffers: Buffer[] = [];
                
                doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
                doc.on('error', (error) => {
                    console.error('Error generating the PDF:', error);
                    reject(error);
                });
                
                doc.on('end', () => {
                    try {
                        const pdfBuffer = Buffer.concat(buffers);
                        resolve(pdfBuffer);
                    } catch (error) {
                        console.error('Error concatenating buffers:', error);
                        reject(error);
                    }
                });
                
                this.addMonthlySummaryContent(doc, summary, reservations, payments);
                doc.end();
            } catch (error) {
                console.error('General error in generateMonthlySummaryPdf:', error);
                reject(error);
            }
        });
    }

    private static addMonthlySummaryContent(
        doc: PDFKit.PDFDocument,
        summary: MonthlySummary,
        reservations: any[],
        payments: any[]
    ): void {
        try {
            // Logo y encabezado
            const logoPath = path.join(process.cwd(), 'src', 'assets', 'images', 'logo_texto_negro.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 100, 30, {
                    fit: [400, 100],
                    align: 'center'
                });
            }

            // Título
            doc.moveDown(4);
            doc.y = 150;
            doc.fontSize(20)
               .text(`Monthly Summary - ${summary.month}/${summary.year}`, {
                   align: 'center'
               })
               .moveDown();

            // Resumen general
            doc.fontSize(12)
               .text('General Summary', { underline: true })
               .moveDown()
               .text(`Total Reservations: ${summary.totalReservations || 0}`)
               .text(`Total Payments: ${summary.totalPayments || 0}`)
               .text(`Total Revenue: $${(Number(summary.totalRevenue) || 0).toFixed(2)}`)
               .moveDown();

            // Lista de Reservas
            if (reservations && reservations.length > 0) {
                doc.text('Reservations for this month', { underline: true })
                   .moveDown();
                
                reservations.forEach(reservation => {
                    const clientName = reservation.clientName || 'No specified';
                    const clientLastName = reservation.clientLastName || '';
                    const checkIn = this.formatDate(reservation.checkInDate);
                    const checkOut = this.formatDate(reservation.checkOutDate);
                    const totalAmount = Number(reservation.totalAmount) || 0;
                    
                    doc.text(`Reservation #${reservation.id || 'N/A'}`)
                       .text(`Client: ${clientName} ${clientLastName}`)
                       .text(`Check-in: ${checkIn}`)
                       .text(`Check-out: ${checkOut}`)
                       .text(`Total: $${totalAmount.toFixed(2)}`)
                       .moveDown();
                });
            } else {
                doc.text('No reservations for this month')
                   .moveDown();
            }

            // Lista de Pagos
            if (payments && payments.length > 0) {
                doc.text('Payments for this month', { underline: true })
                   .moveDown();
                
                payments.forEach(payment => {
                    const amount = Number(payment.amount) || 0;
                    const paymentDate = this.formatDate(payment.paymentDate);
                    
                    doc.text(`Payment #${payment.id || 'N/A'}`)
                       .text(`Reservation: #${payment.reservationId || 'N/A'}`)
                       .text(`Client: ${payment.clientName || 'N/A'} ${payment.clientLastName || ''}`)
                       .text(`Amount: $${amount.toFixed(2)}`)
                       .text(`Date: ${paymentDate}`)
                       .moveDown();
                });
            } else {
                doc.text('No payments for this month')
                   .moveDown();
            }

            // Pie de página
            doc.fontSize(10)
               .text('Generated on: ' + new Date().toLocaleDateString(), {
                   align: 'center'
               });
        } catch (error) {
            console.error('Error generating the PDF content:', error);
            doc.text('Error generating the PDF content')
               .moveDown()
               .text('Please try again later');
        }
    }

    private static formatDate(date: any): string {
        try {
            if (!date) return 'Not specified';
            
            // Si es un string y tiene el formato MM-DD-YYYY HH:mm
            if (typeof date === 'string') {
                // Verificar si es el nuevo formato MM-DD-YYYY HH:mm
                const dateTimeRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4} (0[0-9]|1[0-9]|2[3]):([0-5][0-9])$/;
                if (dateTimeRegex.test(date)) {
                    return date; // Ya está en el formato deseado, lo devolvemos tal cual
                }
                
                // Si no es el nuevo formato pero es un string con 'T' (formato ISO)
                if (date.includes('T')) {
                    const [fullDate, fullTime] = date.split('T');
                    const time = fullTime.split(':').slice(0, 2).join(':'); // Extraer HH:mm
                    return `${fullDate} ${time}`; // Combinar fecha y hora
                }
            }
    
            // Si es un objeto Date, formatear manualmente al nuevo formato
            const dateObj = new Date(date);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                return `${month}-${day}-${year} ${hours}:${minutes}`;
            }
    
            return 'Invalid date';
        } catch (error) {
            return 'Invalid date';
        }
    }

    private static getStatusInEnglish(status: string | undefined): string | undefined {
        switch (status) {
            case 'Confirmed':
                return 'Confirmed';
            case 'Cancelled':
                return 'Cancelled';
            case 'Pending':
                return 'Pending';
            case 'Completed':
                return 'Completed';
            default:
                return undefined;
        }
    }

    public static addBackgroundImage(doc: PDFKit.PDFDocument): void {
        try {
            // Intentar diferentes rutas para la imagen de fondo
            const possiblePaths = [
                path.join(__dirname, '..', 'assets', 'images', 'background.png'),
                path.join(process.cwd(), 'src', 'assets', 'images', 'background.png'),
                path.join(process.cwd(), 'assets', 'images', 'background.png'),
                path.join(process.cwd(), 'dist', 'assets', 'images', 'background.png')
            ];

            let backgroundImagePath = '';
            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    backgroundImagePath = possiblePath;
                    break;
                }
            }
            console.log(backgroundImagePath);
            if (!backgroundImagePath) {
                console.error('Background image not found');
                return;
            }

            const imageBuffer = fs.readFileSync(backgroundImagePath);
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            
            doc.save();
            doc.fillOpacity(1);
            doc.image(imageBuffer, 0, 0, {
                width: pageWidth,
                height: pageHeight
            });
            doc.fillOpacity(1);
            doc.restore();
        } catch (error) {
            console.error('Error adding background image');
            // No lanzamos el error para no interrumpir la generación del PDF
        }
    }
}