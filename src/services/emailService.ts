import nodemailer from 'nodemailer';
import { Reservation } from '../types/reservations.js';

export default class EmailService {
    private static transporter = nodemailer.createTransport({
        // Configuración segun tu proveedor de email
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: Boolean(process.env.EMAIL_SECURE),
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // Enviar correo de confirmación de reserva
    static async sendConfirmationEmail(to: string, reservation: Reservation): Promise<void> {
       await this.transporter.sendMail({
        from: `"Miami Get Away" <${process.env.EMAIL_USER}>`,
        to: reservation.clientEmail,
        subject: `Reservation Confirmation #${reservation.id}`,
        html: `
            <h1>Reservation Confirmed</h1>
            <p>Dear ${reservation.clientName},</p>
            <p>Your reservation has been confirmed:</p>
            <ul>
            <li>Check-in: ${reservation.checkInDate.toLocaleDateString()}</li>
            <li>Check-out: ${reservation.checkOutDate.toLocaleDateString()}</li>
            <li>Nights: ${reservation.nights}</li>
            <li>Total: $${reservation.totalAmount}</li>
            </ul>
            <p>Thank you for choosing Miami Get Away.</p>
            <p>Best regards,<br>Miami Get Away Team</p>
        `
       });
    }

    // Enviar correo con el comprobante de reserva
    static async sendReservationPdf(reservation: Reservation, pdfPath: string): Promise<void> {
        await this.transporter.sendMail({
            from: `"Miami Getaway" <${process.env.EMAIL_USER}>`,
            to: reservation.clientEmail,
            subject: `Reservation Receipt #${reservation.id}`,
            html: `
                <h1>Reservation Receipt</h1>
                <p>Dear ${reservation.clientName},</p>
                <p>Please find attached the receipt for your reservation.</p>
                <p>Thank you for choosing Miami Get Away.</p>
                <p>Best regards,<br>Miami Get Away Team</p>
            `,
            attachments: [{
                filename: `reservation-${reservation.id}.pdf`,
                path: pdfPath,
                contentType: 'application/pdf',
            }],
        });
    }

    // Enviar correo con información de pago
    static async sendPaymentNotification(reservation: Reservation, amount: number, isFullPayment: boolean): Promise<void> {
        await this.transporter.sendMail({
            from: `"Miami Getaway" <${process.env.EMAIL_USER}>`,
            to: reservation.clientEmail,
            subject: `${isFullPayment ? 'Full' : 'Partial'} Payment Received - Reservation #${reservation.id}`,
            html: `
                <h1>${isFullPayment ? 'Full' : 'Partial'} Payment Received</h1>
                <p>Dear ${reservation.clientName},</p>
                <p>We have received your payment of <strong>$${amount}</strong> for reservation #${reservation.id}.</p>
                <p>Current payment status: <strong>${isFullPayment ? 'COMPLETE' : 'PARTIAL'}</strong></p>
                ${!isFullPayment ? `<p>Remaining balance: <strong>$${reservation.amountDue}</strong></p>` : ''}
                <p>Reservation details:</p>
                <ul>
                    <li>Check-in: ${reservation.checkInDate.toLocaleDateString()}</li>
                    <li>Check-out: ${reservation.checkOutDate.toLocaleDateString()}</li>
                    <li>Total: $${reservation.totalAmount}</li>
                </ul>
                <p>Thank you for choosing Miami Get Away.</p>
                <p>Best regards,<br>Miami Get Away Team</p>
            `
        });
    }

    // Enviar correo con actualización de estado de reserva
    static async sendStatusChangeNotification(reservation: Reservation, previousStatus: string): Promise<void> {
        const statusMessages: {[key: string]: string} = {
            'pending': 'Your reservation is pending confirmation',
            'confirmed': 'Your reservation has been confirmed',
            'checked_in': 'Check-in completed. Enjoy your stay!',
            'checked_out': 'Check-out completed. Thank you for your visit!'
        };

        await this.transporter.sendMail({
            from: `"Miami Getaway" <${process.env.EMAIL_USER}>`,
            to: reservation.clientEmail,
            subject: `Reservation Update #${reservation.id} - ${statusMessages[reservation.status]}`,
            html: `
                <h1>Reservation Status Update</h1>
                <p>Dear ${reservation.clientName},</p>
                <p>The status of your reservation #${reservation.id} has changed from <strong>${previousStatus}</strong> to <strong>${reservation.status}</strong>.</p>
                <p>${statusMessages[reservation.status]}</p>
                <p>Reservation details:</p>
                <ul>
                    <li>Check-in: ${reservation.checkInDate.toLocaleDateString()}</li>
                    <li>Check-out: ${reservation.checkOutDate.toLocaleDateString()}</li>
                    <li>Total: $${reservation.totalAmount}</li>
                    <li>Paid: $${reservation.amountPaid}</li>
                    ${reservation.amountDue > 0 ? `<li>Balance due: $${reservation.amountDue}</li>` : ''}
                </ul>
                <p>Thank you for choosing Miami Get Away.</p>
                <p>Best regards,<br>Miami Get Away Team</p>
            `
        });
    }
}
