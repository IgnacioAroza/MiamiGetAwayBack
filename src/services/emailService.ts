import nodemailer from 'nodemailer';
import { Reservation, ReservationWithClient } from '../types/reservations.js';
import PdfService from '../services/pdfService.js';
import fs from 'fs';

export default class EmailService {
    private static transporter = nodemailer.createTransport({
        // Configuración segun tu proveedor de email
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    });

    // Método para verificar la configuración
    static async verifyConnection() {
        try {
            const verify = await this.transporter.verify();
            return verify;
        } catch (error) {
            console.error('Email verification failed:', error);
            throw error;
        }
    }

    // Enviar correo de confirmación de reserva
    static async sendConfirmationEmail(to: string, reservation: ReservationWithClient): Promise<void> {
        try {
            // Generar el PDF
            const pdfPath = await PdfService.generateInvoicePdf(reservation);
            
            const mailOptions = {
                from: `"Miami Get Away" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: `Reservation Confirmation #${reservation.id}`,
                html: `
                    <h1 style="font-size: 24px;">Reservation Confirmed</h1>
                    <p style="font-size: 16px;">Dear ${reservation.clientName},</p>
                    <p style="font-size: 16px;">Your reservation has been confirmed. Please find attached the reservation details.</p>
                    <p style="font-size: 16px;">Reservation details:</p>
                    <ul style="font-size: 16px;">
                    <li style="font-size: 16px;"><strong>Check-in:</strong> ${new Date(reservation.checkInDate).toLocaleDateString()}</li>
                    <li style="font-size: 16px;"><strong>Check-out:</strong> ${new Date(reservation.checkOutDate).toLocaleDateString()}</li>
                    <li style="font-size: 16px;"><strong>Nights:</strong> ${reservation.nights}</li>
                    <li style="font-size: 16px;"><strong>Total:</strong> $${reservation.totalAmount}</li>
                    </ul>
                    <p style="font-size: 16px;">Thank you for choosing Miami Get Away.</p>
                    <p style="font-size: 16px;">Best regards,<br>Miami Get Away Team</p>
                `,
                attachments: [{
                    filename: `reservation-${reservation.id}-${reservation.clientName}-${reservation.clientLastname}.pdf`,
                    path: pdfPath,
                    contentType: 'application/pdf',
                }]
            };

            const info = await this.transporter.sendMail(mailOptions);

            // Eliminar el archivo PDF después de enviar el correo
            try {
                fs.unlinkSync(pdfPath);
            } catch (error) {
                console.error('Error deleting temporary PDF file:', error);
                // No lanzamos el error para no interrumpir el flujo principal
            }
        } catch (error) {
            console.error('Error sending confirmation email:', error);
            throw error;
        }
    }

    // Enviar correo con información de pago
    static async sendPaymentNotification(reservation: ReservationWithClient, amount: number, isFullPayment: boolean): Promise<void> {
        try {
            if (!amount || isNaN(amount)) {
                throw new Error('Invalid payment amount');
            }

            await this.transporter.sendMail({
                from: `"Miami Get Away" <${process.env.EMAIL_USER}>`,
                to: reservation.clientEmail,
                subject: `${isFullPayment ? 'Full' : 'Partial'} Payment Received - Reservation #${reservation.id}`,
                html: `
                    <h1 style="font-size: 24px;">${isFullPayment ? 'Full' : 'Partial'} Payment Received</h1>
                    <p style="font-size: 16px;">Dear ${reservation.clientName},</p>
                    <p style="font-size: 16px;">We have received your payment of <strong>$${amount}</strong> for your reservation with us!.</p>
                    <p style="font-size: 16px;">Current payment status: <strong>${isFullPayment ? 'COMPLETE' : 'PARTIAL'}</strong></p>
                    ${!isFullPayment ? `<p style="font-size: 16px;">Remaining balance: <strong>$${reservation.amountDue}</strong></p>` : ''}
                    <p style="font-size: 16px;">Reservation details:</p>
                    <ul style="font-size: 16px;">
                        <li style="font-size: 16px;"><strong>Check-in:</strong> ${new Date(reservation.checkInDate).toLocaleDateString()}</li>
                        <li style="font-size: 16px;"><strong>Check-out:</strong> ${new Date(reservation.checkOutDate).toLocaleDateString()}</li>
                        <li style="font-size: 16px;"><strong>Total:</strong> $${reservation.totalAmount}</li>
                    </ul>
                    <p style="font-size: 16px;">Thank you for choosing Miami Get Away.</p>
                    <p style="font-size: 16px;">Best regards,<br>Miami Get Away Team</p>
                `
            });
        } catch (error) {
            console.error('Error sending payment notification:', error);
            throw error;
        }
    }

    // Enviar correo con actualización de estado de reserva
    static async sendStatusChangeNotification(reservation: ReservationWithClient, previousStatus: string): Promise<void> {
        const statusMessages: {[key: string]: string} = {
            'pending': 'Your reservation is pending confirmation',
            'confirmed': 'Your reservation has been confirmed',
            'checked_in': 'Check-in completed. Enjoy your stay!',
            'checked_out': 'Check-out completed. Thank you for your visit!'
        };

        await this.transporter.sendMail({
            from: `"Miami Get Away" <${process.env.EMAIL_USER}>`,
            to: reservation.clientEmail,
            subject: `Reservation Update #${reservation.id} - ${statusMessages[reservation.status]}`,
            html: `
                <h1 style="font-size: 24px;">Reservation Status Update</h1>
                <p style="font-size: 16px;">Dear ${reservation.clientName},</p>
                <p style="font-size: 16px;">The status of your reservation #${reservation.id} has changed from <strong>${previousStatus}</strong> to <strong>${reservation.status}</strong>.</p>
                <p style="font-size: 16px;">${statusMessages[reservation.status]}</p>
                <p style="font-size: 16px;">Reservation details:</p>
                <ul style="font-size: 16px;">
                    <li style="font-size: 16px;"><strong>Check-in:</strong> ${new Date(reservation.checkInDate).toLocaleDateString()}</li>
                    <li style="font-size: 16px;"><strong>Check-out:</strong> ${new Date(reservation.checkOutDate).toLocaleDateString()}</li>
                    <li style="font-size: 16px;"><strong>Total:</strong> $${reservation.totalAmount}</li>
                    <li style="font-size: 16px;"><strong>Paid:</strong> $${reservation.amountPaid}</li>
                    ${reservation.amountDue > 0 ? `<li style="font-size: 16px;"><strong>Balance due:</strong> $${reservation.amountDue}</li>` : ''}
                </ul>
                <p style="font-size: 16px;">Thank you for choosing Miami Get Away.</p>
                <p style="font-size: 16px;">Best regards,<br>Miami Get Away Team</p>
            `
        });
    }

    static async sendMonthlySummaryEmail(
        to: string,
        pdfBuffer: Buffer,
        month: number,
        year: number
    ): Promise<void> {
        try {
            const mailOptions = {
                from: `"Miami Get Away" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: `Monthly Summary - ${month}/${year}`,
                html: `
                    <h1 style="font-size: 24px;">Monthly Summary</h1>
                    <p style="font-size: 16px;">Attached you will find the monthly summary of reservations and payments for ${month}/${year}.</p>
                    <p style="font-size: 16px;">This summary includes:</p>
                    <ul style="font-size: 16px;">
                        <li>Total reservations for the month</li>
                        <li>Total payments received</li>
                        <li>Total revenue</li>
                        <li>Detailed list of reservations</li>
                        <li>Detailed list of payments</li>
                    </ul>
                    <p style="font-size: 16px;">If you have any questions, please do not hesitate to contact us.</p>
                    <p style="font-size: 16px;">Best regards,<br>Miami Get Away Team</p>
                `,
                attachments: [{
                    filename: `monthly-summary-${year}-${month}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }]
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Error sending monthly summary email:', error);
            throw error;
        }
    }
}
