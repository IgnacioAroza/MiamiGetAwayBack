import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import PdfService from '../../../services/pdfService.js';

describe('PdfService', () => {
    it('incrusta la marca de agua una sola vez aunque el PDF tenga varias páginas', async () => {
        const reservation: any = {
            id: 1, clientName: 'Test', clientLastname: 'User', clientEmail: 't@t.com', apartmentName: 'Apt',
            checkInDate: '06-01-2026 15:00', checkOutDate: '06-08-2026 11:00', nights: 7, pricePerNight: 100,
            cleaningFee: 0, otherExpenses: 0, taxes: 0, totalAmount: 700, amountPaid: 0, amountDue: 700,
            parkingFee: 0, cancellationFee: 0, status: 'confirmed', paymentStatus: 'pending', createdAt: '06-01-2026 10:00'
        };
        const pdf = await PdfService.generatePdfForDownload(reservation);
        const pages = pdf.toString('latin1').match(/\/Type \/Page\n/g)?.length ?? 0;
        expect(pages).toBeGreaterThan(1);

        const logo = fs.readFileSync(path.join(process.cwd(), 'src', 'assets', 'images', 'logo_texto_negro.png'));
        const width = logo.readUInt32BE(16);
        // una imagen + su máscara alfa
        expect(pdf.toString('latin1').match(new RegExp(`/Width ${width}\\b`, 'g'))).toHaveLength(2);
    });
});
