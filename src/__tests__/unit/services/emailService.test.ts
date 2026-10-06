import { describe, it, expect, vi } from 'vitest';
import EmailService from '../../../services/emailService.js';
import PdfService from '../../../services/pdfService.js';
import nodemailer from 'nodemailer';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail: vi.fn() })) } }));
vi.mock('../../../services/pdfService.js', () => ({ default: {
    generatePdfForDownload: vi.fn().mockResolvedValue(Buffer.from('%PDF-test')),
    generateInvoicePdf: vi.fn()
} }));

const reservation = { id: 1, clientName: 'Ana', clientLastname: 'Test', checkInDate: '2026-10-10', checkOutDate: '2026-10-12', nights: 2, totalAmount: 100 } as any;
const sendMail = vi.mocked(nodemailer.createTransport).mock.results[0].value.sendMail as ReturnType<typeof vi.fn>;

describe('EmailService confirmation', () => {
    it('adjunta el PDF en memoria cuando el envío funciona', async () => {
        sendMail.mockResolvedValueOnce({});
        await EmailService.sendConfirmationEmail('ana@example.invalid', reservation);
        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ attachments: [expect.objectContaining({ content: Buffer.from('%PDF-test') })] }));
        expect(PdfService.generateInvoicePdf).not.toHaveBeenCalled();
    });

    it('no genera archivo temporal cuando falla el envío', async () => {
        sendMail.mockRejectedValueOnce(new Error('SMTP failed'));
        await expect(EmailService.sendConfirmationEmail('ana@example.invalid', reservation)).rejects.toThrow('SMTP failed');
        expect(PdfService.generateInvoicePdf).not.toHaveBeenCalled();
    });
});
