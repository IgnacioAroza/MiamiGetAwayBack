import { Request, Response } from 'express';
import ReservationService from '../services/reservationService.js';
import { validateReservation, validatePartialReservation } from '../schemas/reservationSchema.js';
import ReservationPaymentsService from '../services/reservationPaymentsService.js';
import { ReservationModel } from '../models/reservation.js';
import EmailService from '../services/emailService.js';
import db from '../utils/db_render.js';
import PdfService from '../services/pdfService.js';

export class ReservationController {
    static async getAllReservations(req: Request, res: Response): Promise<void> {
        try {
            // Obtener filtros desde query params
            const filters: any = {};
            
            if (req.query.startDate) {
                try {
                    // Ya no convertimos a Date, pasamos directamente el string
                    filters.startDate = req.query.startDate as string;
                    
                    // Validar el formato de fecha MM-DD-YYYY HH:mm
                    const dateTimeRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4} (0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
                    if (!dateTimeRegex.test(filters.startDate)) {
                        throw new Error('Check in date format is invalid. Use MM-DD-YYYY HH:mm');
                    }
                } catch (error) {
                    res.status(400).json({ error: 'Check in date is invalid. Format must be MM-DD-YYYY HH:mm' });
                    return;
                }
            }
            
            if (req.query.endDate) {
                try {
                    // Ya no convertimos a Date, pasamos directamente el string
                    filters.endDate = req.query.endDate as string;
                    
                    // Validar el formato de fecha MM-DD-YYYY HH:mm
                    const dateTimeRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4} (0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
                    if (!dateTimeRegex.test(filters.endDate)) {
                        throw new Error('Check out date format is invalid. Use MM-DD-YYYY HH:mm');
                    }
                } catch (error) {
                    res.status(400).json({ error: 'Check out date is invalid. Format must be MM-DD-YYYY HH:mm' });
                    return;
                }
            }
            
            if (req.query.status) {
                filters.status = req.query.status as string;
            }
            
            if (req.query.clientName) {
                filters.clientName = req.query.clientName as string;
            }
            
            if (req.query.clientEmail) {
                filters.clientEmail = req.query.clientEmail as string;
            }

            // Nuevos filtros
            if (req.query.q) {
                filters.q = req.query.q as string;
            }

            if (req.query.clientLastname) {
                filters.clientLastname = req.query.clientLastname as string;
            }

            // Filtro upcoming
            if (req.query.upcoming) {
                const upcomingStr = req.query.upcoming as string;
                if (upcomingStr === 'true' || upcomingStr === '1') {
                    filters.upcoming = true;
                } else if (upcomingStr === 'false' || upcomingStr === '0') {
                    filters.upcoming = false;
                } else {
                    res.status(400).json({ error: 'upcoming parameter must be true, false, 1, or 0' });
                    return;
                }
            }

            // Filtro fromDate (solo válido con upcoming=true)
            if (req.query.fromDate) {
                if (!filters.upcoming) {
                    res.status(400).json({ error: 'fromDate can only be used with upcoming=true' });
                    return;
                }
                
                const fromDate = req.query.fromDate as string;
                const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;
                if (!dateRegex.test(fromDate)) {
                    res.status(400).json({ error: 'fromDate format is invalid. Use MM-DD-YYYY' });
                    return;
                }
                filters.fromDate = fromDate;
            }

            // Filtro withinDays (solo válido con upcoming=true)
            if (req.query.withinDays) {
                if (!filters.upcoming) {
                    res.status(400).json({ error: 'withinDays can only be used with upcoming=true' });
                    return;
                }
                
                const withinDays = parseInt(req.query.withinDays as string);
                if (isNaN(withinDays) || withinDays <= 0) {
                    res.status(400).json({ error: 'withinDays must be a positive integer' });
                    return;
                }
                filters.withinDays = withinDays;
            }
            
            const reservations = await ReservationService.getAllReservations(filters);
            res.status(200).json(reservations);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservations' });
        }
    }

    static async getReservationById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const reservation = await ReservationService.getReservationById(parseInt(id));
            if (!reservation) {
                res.status(404).json({ error: 'Reservation not found' });
                return;
            }
            res.status(200).json(reservation);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservation' });
        }
    }
    
    static async createReservation(req: Request, res: Response): Promise<void> {
        try {
            const validateResult = validateReservation(req.body);
            if (!validateResult.success) {
                res.status(400).json({ 
                    error: 'Validation failed', 
                    details: validateResult.error.format() 
                });
                return;
            }

            const newReservation = await ReservationService.createReservation(validateResult.data);
            res.status(201).json(newReservation);
        } catch (error) {
            res.status(500).json({ error: 'Error creating reservation' });
        }
    }

    static async updateReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const validateResult = validatePartialReservation(req.body);
            if (!validateResult.success) {
                res.status(400).json({ 
                    error: 'Validation failed', 
                    details: validateResult.error.format() 
                });
                return;
            }

            // Si solo viene el estado, usamos el método específico para eso
            if (Object.keys(validateResult.data).length === 1 && validateResult.data.status) {
                const updatedReservation = await ReservationService.updateReservation(parseInt(id), validateResult.data.status);
                res.status(200).json(updatedReservation);
                return;
            }

            // Obtener la reserva actual para calcular los valores faltantes
            const currentReservation = await ReservationService.getReservationById(parseInt(id));
            if (!currentReservation) {
                res.status(404).json({ error: 'Reservation not found' });
                return;
            }

            // Preparar los datos de actualización combinando los datos actuales con los nuevos
            const updateData = { ...validateResult.data };
            
            // Determinar si necesitamos recalcular el precio
            const needsCalculation = updateData.nights !== undefined || 
                                     updateData.pricePerNight !== undefined || 
                                     updateData.cleaningFee !== undefined || 
                                     updateData.otherExpenses !== undefined || 
                                     updateData.parkingFee !== undefined ||
                                     updateData.taxes !== undefined;
            
            // Verificar si estamos recibiendo todos los campos necesarios para el cálculo
            const missingFields = [];
            if (needsCalculation && updateData.pricePerNight === undefined && currentReservation.pricePerNight === undefined) missingFields.push('pricePerNight');
            if (needsCalculation && updateData.cleaningFee === undefined && currentReservation.cleaningFee === undefined) missingFields.push('cleaningFee');
            
            if (missingFields.length > 0) {
                res.status(400).json({ 
                    error: 'Missing required fields for calculation', 
                    missingFields 
                });
                return;
            }

            // Si se actualizan campos relacionados con el precio, calculamos automáticamente el monto total
            let totalAmount = currentReservation.totalAmount;
            let amountDue = currentReservation.amountDue;

            if (needsCalculation) {
                // Usar valores nuevos o mantener los originales si no se proporcionan
                const nights = updateData.nights ?? currentReservation.nights;
                const pricePerNight = updateData.pricePerNight ?? currentReservation.pricePerNight;
                const cleaningFee = updateData.cleaningFee ?? currentReservation.cleaningFee;
                const otherExpenses = updateData.otherExpenses ?? currentReservation.otherExpenses;
                const parkingFee = updateData.parkingFee ?? currentReservation.parkingFee;
                const taxes = updateData.taxes ?? currentReservation.taxes;
                
                // Asegurar que todos los valores sean números
                const nightsNum = Number(nights);
                const pricePerNightNum = Number(pricePerNight);
                const cleaningFeeNum = Number(cleaningFee);
                const otherExpensesNum = Number(otherExpenses);
                const parkingFeeNum = Number(parkingFee);
                const taxesNum = Number(taxes);
                
                // Calcular el subtotal (sin impuestos) primero
                const subtotal = (nightsNum * pricePerNightNum) + cleaningFeeNum + otherExpensesNum + parkingFeeNum;
                
                // Los impuestos ya NO se calculan, se usan directamente como los proporciona el usuario
                
                // Calcular el total incluyendo los impuestos proporcionados por el usuario
                totalAmount = subtotal + taxesNum;
                
                // Verificar si el cálculo resultó en NaN
                if (isNaN(totalAmount)) {
                    // Usar el total actual si el cálculo falló
                    totalAmount = currentReservation.totalAmount;
                }
                
                // Actualizar los campos calculados
                updateData.totalAmount = totalAmount;
                
                // Recalcular amountDue si cambia el precio total
                const currentAmountPaid = updateData.amountPaid ?? currentReservation.amountPaid;
                amountDue = totalAmount - Number(currentAmountPaid);
                
                // Verificar si el cálculo resultó en NaN
                if (isNaN(amountDue)) {
                    // Usar el monto pendiente actual si el cálculo falló
                    amountDue = currentReservation.amountDue;
                } else {
                    // Asegurar que amountDue no sea negativo
                    amountDue = Math.max(0, amountDue);
                }
                
                updateData.amountDue = amountDue;
            }

            // Actualizar el estado de pago según el monto pendiente, si corresponde
            if (updateData.amountPaid !== undefined) {
                const newAmountPaid = Number(updateData.amountPaid);
                
                // Asegurar que newAmountPaid es un número
                if (isNaN(newAmountPaid)) {
                    // No continuar con esta actualización
                } else {
                    amountDue = totalAmount - newAmountPaid;
                    
                    // Verificar si el cálculo resultó en NaN
                    if (isNaN(amountDue)) {
                        // Usar el monto pendiente actual si el cálculo falló
                        amountDue = currentReservation.amountDue;
                    } else {
                        // Asegurar que amountDue no sea negativo
                        amountDue = Math.max(0, amountDue);
                    }
                    
                    updateData.amountDue = amountDue;
                    
                    // Determinar el estado de pago basado en los montos
                    if (amountDue <= 0) {
                        updateData.paymentStatus = 'complete';
                    } else if (newAmountPaid > 0) {
                        updateData.paymentStatus = 'partial';
                    } else {
                        updateData.paymentStatus = 'pending';
                    }
                }
            }

            // Convertir a formato snake_case para la base de datos
            const formattedData: any = {};
            Object.entries(updateData).forEach(([key, value]) => {
                // Convertir camelCase a snake_case (e.g., pricePerNight -> price_per_night)
                const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
                
                // No incluir valores undefined o null para campos obligatorios
                if (value !== undefined && value !== null) {
                    formattedData[snakeKey] = value;
                } else if (['total_amount', 'amount_due'].includes(snakeKey)) {
                    // Si es un campo obligatorio que no puede ser null, usar el valor actual
                    formattedData[snakeKey] = key === 'totalAmount' 
                        ? currentReservation.totalAmount 
                        : currentReservation.amountDue;
                }
            });

            // Asegurar que total_amount siempre tenga un valor válido
            if (formattedData.total_amount === undefined || 
                formattedData.total_amount === null || 
                isNaN(formattedData.total_amount)) {
                
                // Si el valor actual también es inválido, usamos un cálculo de respaldo
                if (currentReservation.totalAmount === undefined || 
                    currentReservation.totalAmount === null || 
                    isNaN(currentReservation.totalAmount)) {
                    
                    // Respaldo: calcular basado en los valores disponibles
                    const nights = currentReservation.nights || 1;
                    const pricePerNight = currentReservation.pricePerNight || 0;
                    const cleaningFee = currentReservation.cleaningFee || 0;
                    const otherExpenses = currentReservation.otherExpenses || 0;
                    const parkingFee = currentReservation.parkingFee || 0;
                    const taxes = currentReservation.taxes || 0;
                    
                    formattedData.total_amount = (nights * pricePerNight) + cleaningFee + otherExpenses + parkingFee + taxes;
                } else {
                    formattedData.total_amount = currentReservation.totalAmount;
                }
            }

            // Asegurar que amount_due siempre tenga un valor válido
            if (formattedData.amount_due === undefined || 
                formattedData.amount_due === null || 
                isNaN(formattedData.amount_due)) {
                
                // Si el valor actual también es inválido, usamos un cálculo de respaldo
                if (currentReservation.amountDue === undefined || 
                    currentReservation.amountDue === null || 
                    isNaN(currentReservation.amountDue)) {
                    
                    // Respaldo: calcular como totalAmount - amountPaid
                    const totalAmount = formattedData.total_amount; // Ya hemos garantizado que este valor es válido
                    const amountPaid = formattedData.amount_paid || currentReservation.amountPaid || 0;
                    
                    formattedData.amount_due = Math.max(0, totalAmount - amountPaid);
                } else {
                    formattedData.amount_due = currentReservation.amountDue;
                }
            }

            // Asegurarnos de que los valores finales sean números válidos, no strings
            if (typeof formattedData.total_amount === 'string') {
                formattedData.total_amount = Number(formattedData.total_amount);
            }
            
            if (typeof formattedData.amount_due === 'string') {
                formattedData.amount_due = Number(formattedData.amount_due);
            }

            // Verificación final
            if (isNaN(formattedData.total_amount) || formattedData.total_amount === undefined) {
                res.status(400).json({ error: 'No se pudo calcular un valor válido para total_amount' });
                return;
            }
            
            if (isNaN(formattedData.amount_due) || formattedData.amount_due === undefined) {
                res.status(400).json({ error: 'No se pudo calcular un valor válido para amount_due' });
                return;
            }

            // Actualizar la reserva con todos los valores calculados
            const updatedReservation = await ReservationModel.updateReservation(parseInt(id), formattedData);
            
            res.status(200).json(updatedReservation);
        } catch (error) {
            console.error('Error in updateReservation:', error); // Log detallado del error
            res.status(500).json({ error: 'Error updating reservation' });
        }
    }

    static async deleteReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            // Verificar que la reserva existe
            const reservation = await ReservationService.getReservationById(parseInt(id));
            if (!reservation) {
                res.status(404).json({ error: 'Reservation not found' });
                return;
            }

            // Intentar eliminar la reserva
            await ReservationService.deleteReservation(parseInt(id));
            res.status(200).json({ message: 'Reservation deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error deleting reservation' });
        }
    }
    
    // Método para registrar pagos
    static async registerPayment(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const { amount, paymentMethod, paymentReference, notes } = req.body;
        
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            res.status(400).json({ error: 'Valid payment amount is required' });
            return;
        }
        
        if (!paymentMethod) {
            res.status(400).json({ error: 'Payment method is required' });
            return;
        }
        
        try {
            const updatedReservation = await ReservationService.registerPayment(
                parseInt(id),
                Number(amount),
                paymentMethod,
                paymentReference,
                notes
            );
            res.status(200).json(updatedReservation);
        } catch (error) {
            res.status(500).json({ error: 'Error registering payment' });
        }
    }
    
    // Método para generar y enviar PDF
    static async generatePdf(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        
        try {
            const pdfPath = await ReservationService.generateAndSendPDF(parseInt(id));
            
            // Enviar respuesta con confirmación
            res.status(200).json({ 
                message: 'PDF generated and sent successfully',
                pdfPath
            });
        } catch (error) {
            res.status(500).json({ error: 'Error generating PDF' });
        }
    }

    // Método para generar y descargar PDF directamente
    static async downloadPdf(req: Request, res: Response): Promise<void> {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({ error: 'ID de reserva inválido' });
            return;
        }

        try {
            // Obtener la reserva
            const reservation = await ReservationService.getReservationById(parseInt(id));
            if (!reservation) {
                res.status(404).json({ error: 'Reservation not found' });
                return;
            }

            // Obtener los pagos de la reserva
            const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));

            // Generar el PDF pasando los pagos
            const pdfBuffer = await PdfService.generatePdfForDownload(reservation, payments);

            if (!pdfBuffer || pdfBuffer.length === 0) {
                res.status(500).json({ error: 'Error generating PDF: Empty buffer' });
                return;
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=reservation-${id}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.status(200).send(pdfBuffer);
        } catch (error: any) {
            const errorMessage = error.message || 'Error desconocido al generar el PDF';
            res.status(500).json({
                error: 'Error generating PDF for download',
                details: errorMessage,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Método para obtener pagos de una reserva específica
    static async getReservationPayments(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
            res.status(200).json(payments);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching reservation payments' });
        }
    }

    // Metodo para actualizar el estado del pago de una reserva
    static async updatePaymentStatus(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        
        // Obtener los datos del cuerpo, intentando diferentes formatos de nombres de campo
        // para mayor compatibilidad
        let amount_paid = req.body.amount_paid;
        let amount_due = req.body.amount_due;
        let payment_status = req.body.payment_status;
        
        // Intentar con camelCase si los snake_case no están presentes
        if (amount_paid === undefined) amount_paid = req.body.amountPaid;
        if (amount_due === undefined) amount_due = req.body.amountDue;
        if (payment_status === undefined) payment_status = req.body.paymentStatus;

        // Asegurar que los valores sean del tipo correcto
        if (amount_paid === undefined || amount_paid === null) {
            amount_paid = 0;
        }

        if (amount_due === undefined || amount_due === null) {
            amount_due = 0;
        }

        // Validaciones
        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({ error: 'Valid reservation ID is required' });
            return;
        }

        // Transformar strings a números si es necesario
        // Eliminar comas o cualquier otro carácter no numérico excepto puntos decimales
        if (typeof amount_paid === 'string') {
            amount_paid = amount_paid.replace(/[^\d.-]/g, '');
        }
        
        if (typeof amount_due === 'string') {
            amount_due = amount_due.replace(/[^\d.-]/g, '');
        }

        // Validar que los montos sean valores numéricos válidos
        const amountPaid = Number(amount_paid);
        const amountDue = Number(amount_due);
        
        if (isNaN(amountPaid) || amountPaid < 0) {
            res.status(400).json({ error: 'Amount paid must be a valid non-negative number' });
            return;
        }
        
        if (isNaN(amountDue) || amountDue < 0) {
            res.status(400).json({ error: 'Amount due must be a valid non-negative number' });
            return;
        }
        
        // Validar payment_status
        const validPaymentStatuses = ['PAID', 'PARTIAL', 'PENDING', 'paid', 'partial', 'pending', 'complete'];
        
        // Si no se proporciona un estado de pago, determinar basado en los montos
        if (!payment_status) {
            if (amountDue <= 0 && amountPaid > 0) {
                payment_status = 'PAID';
            } else if (amountPaid > 0 && amountDue > 0) {
                payment_status = 'PARTIAL';
            } else {
                payment_status = 'PENDING';
            }
        }
        
        if (!validPaymentStatuses.includes(payment_status.toLowerCase())) {
            res.status(400).json({ error: 'Payment status must be one of: PAID, PARTIAL, PENDING' });
            return;
        }
        
        // Normalizar el estado de pago (convertir a minúsculas para la base de datos)
        let normalizedStatus = payment_status.toLowerCase();
        if (normalizedStatus === 'paid') normalizedStatus = 'complete';
        if (normalizedStatus === 'pending') normalizedStatus = 'pending';
        if (normalizedStatus === 'partial') normalizedStatus = 'partial';

        try {
            // Actualizar solo los campos relacionados con el pago
            const updatedReservation = await ReservationService.updatePaymentFields(
                parseInt(id),
                amountPaid,
                amountDue,
                normalizedStatus
            );
            res.status(200).json(updatedReservation);
        } catch (error: any) {
            res.status(error.status || 500).json({ error: error.message || 'Error updating payment status' });
        }
    }

    /**
     * Envía una notificación por email al cliente de la reserva
     */
    static async sendNotification(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const { type } = req.body;

        try {
            // Verify email connection first
            await EmailService.verifyConnection();

            // Get reservation with client details using the service
            const reservationData = await ReservationService.getReservationWithClientDetails(parseInt(id));

            if (!reservationData) {
                res.status(404).json({ error: 'Reservation not found' });
                return;
            }

            // Verify we have the client's email
            if (!reservationData.clientEmail) {
                res.status(400).json({ error: 'The reservation does not have a client email associated' });
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(reservationData.clientEmail)) {
                res.status(400).json({ error: 'Invalid email format' });
                return;
            }

            // Send email based on notification type
            switch (type) {
                case 'confirmation':
                    await EmailService.sendConfirmationEmail(reservationData.clientEmail, reservationData);
                    break;
                case 'status_update':
                    await EmailService.sendStatusChangeNotification(reservationData, reservationData.status);
                    break;
                case 'payment':
                    // Specific validation for payment notifications
                    if (Number(reservationData.amountDue) > 0) {
                        const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
                        
                        if (!payments || payments.length === 0) {
                            res.status(400).json({ 
                                error: 'Cannot send payment notifications without registered payments',
                                details: 'Please register at least one payment before sending the notification'
                            });
                            return;
                        }

                        const lastPayment = payments[0];
                        const isPaymentComplete = Number(reservationData.amountDue) <= 0;

                        await EmailService.sendPaymentNotification(
                            reservationData,
                            lastPayment.amount,
                            isPaymentComplete
                        );
                    } else {
                        res.status(400).json({ 
                            error: 'Payment notification not required',
                            details: 'The pending amount is 0, there are no pending payments to notify'
                        });
                        return;
                    }
                    break;
                default:
                    res.status(400).json({ error: 'Invalid notification type' });
                    return;
            }

            res.status(200).json({
                success: true,
                message: 'Notification sent successfully'
            });
        } catch (error) {
            console.error('Error sending notification:', error);
            res.status(500).json({ error: 'Error sending notification' });
        }
    }
}
