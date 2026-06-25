import { Request, Response } from 'express';
import ReservationService from '../services/reservationService.js';
import { validateReservation, validatePartialReservation } from '../schemas/reservationSchema.js';
import ReservationPaymentsService from '../services/reservationPaymentsService.js';
import { ReservationModel } from '../models/reservation.js';
import EmailService from '../services/emailService.js';
import db from '../utils/db_render.js';
import PdfService from '../services/pdfService.js';
import ImageService from '../services/imageService.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { ok, created, badRequest, notFound, conflict, serverError } from '../utils/response.js';

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
                    badRequest(res, 'Check in date is invalid. Format must be MM-DD-YYYY HH:mm');
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
                    badRequest(res, 'Check out date is invalid. Format must be MM-DD-YYYY HH:mm');
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
                    badRequest(res, 'upcoming parameter must be true, false, 1, or 0');
                    return;
                }
            }

            // Filtro fromDate (solo válido con upcoming=true)
            if (req.query.fromDate) {
                if (!filters.upcoming) {
                    badRequest(res, 'fromDate can only be used with upcoming=true');
                    return;
                }
                
                const fromDate = req.query.fromDate as string;
                const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/;
                if (!dateRegex.test(fromDate)) {
                    badRequest(res, 'fromDate format is invalid. Use MM-DD-YYYY');
                    return;
                }
                filters.fromDate = fromDate;
            }

            // Filtro withinDays (solo válido con upcoming=true)
            if (req.query.withinDays) {
                if (!filters.upcoming) {
                    badRequest(res, 'withinDays can only be used with upcoming=true');
                    return;
                }
                
                const withinDays = parseInt(req.query.withinDays as string);
                if (isNaN(withinDays) || withinDays <= 0) {
                    badRequest(res, 'withinDays must be a positive integer');
                    return;
                }
                filters.withinDays = withinDays;
            }
            
            const pagination = parsePagination(req.query);
            const { rows, total } = await ReservationService.getAllReservations(filters, pagination ?? undefined);
            if (pagination) {
                ok(res, paginatedResponse(rows, total, pagination));
            } else {
                ok(res, rows);
            }
        } catch (error) {
            serverError(res, 'Error fetching reservations');
        }
    }

    static async getReservationById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const reservation = await ReservationService.getReservationById(parseInt(id));
            if (!reservation) {
                notFound(res, 'Reservation not found');
                return;
            }
            ok(res, reservation);
        } catch (error) {
            serverError(res, 'Error fetching reservation');
        }
    }
    
    static async createReservation(req: Request, res: Response): Promise<void> {
        try {
            const validateResult = validateReservation(req.body);
            if (!validateResult.success) {
                badRequest(res, 'Validation failed', validateResult.error.format());
                return;
            }

            const { initialPayment, ...reservationData } = validateResult.data;

            const newReservation = await ReservationService.createReservation(reservationData as any);

            if (initialPayment) {
                const { amount, paymentMethod, paymentReference, notes } = initialPayment;

                if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                    res.status(400).json({
                        error: 'payment_error',
                        message: 'Error al registrar el pago',
                        details: 'Valid initial payment amount is required',
                        reservationId: newReservation?.id
                    });
                    return;
                }

                if (!paymentMethod) {
                    res.status(400).json({
                        error: 'payment_error',
                        message: 'Error al registrar el pago',
                        details: 'Initial payment method is required',
                        reservationId: newReservation?.id
                    });
                    return;
                }

                try {
                    await ReservationPaymentsService.createPayment({
                        reservationId: Number(newReservation.id),
                        amount: Number(amount),
                        paymentMethod,
                        paymentReference,
                        notes,
                        paymentDate: new Date()
                    });

                    const updatedReservation = await ReservationService.getReservationById(Number(newReservation.id));
                    created(res, updatedReservation);
                    return;
                } catch (err: any) {
                    await ReservationModel.deleteReservation(Number(newReservation.id)).catch(() => {});
                    res.status(400).json({
                        error: 'payment_error',
                        message: 'Error al registrar el pago',
                        details: err?.message || 'Unknown payment error'
                    });
                    return;
                }
            }

            created(res, newReservation);
        } catch (error: any) {
            console.error('Error in createReservation:', error);
            serverError(res, error.message || 'Error creating reservation');
        }
    }

    static async putReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const validateResult = validateReservation(req.body);
            if (!validateResult.success) {
                badRequest(res, 'Validation failed', validateResult.error.format());
                return;
            }

            const data = validateResult.data;

            const subtotal = (data.nights * data.pricePerNight) + data.cleaningFee + data.otherExpenses + data.parkingFee;
            const totalAmount = subtotal + data.taxes;
            const amountDue = Math.max(0, totalAmount - data.amountPaid);

            let paymentStatus: 'pending' | 'partial' | 'completed';
            if (amountDue <= 0) {
                paymentStatus = 'completed';
            } else if (data.amountPaid > 0) {
                paymentStatus = 'partial';
            } else {
                paymentStatus = 'pending';
            }

            const formattedData: any = {
                apartment_id: data.apartmentId,
                client_id: data.clientId,
                check_in_date: data.checkInDate,
                check_out_date: data.checkOutDate,
                nights: data.nights,
                price_per_night: data.pricePerNight,
                cleaning_fee: data.cleaningFee,
                other_expenses: data.otherExpenses,
                taxes: data.taxes,
                parking_fee: data.parkingFee,
                cancellation_fee: data.cancellationFee,
                total_amount: totalAmount,
                amount_paid: data.amountPaid,
                amount_due: amountDue,
                status: data.status,
                payment_status: paymentStatus,
                notes: data.notes ?? null,
            };

            const updatedReservation = await ReservationModel.updateReservation(parseInt(id), formattedData);
            ok(res, updatedReservation);
        } catch (error) {
            serverError(res, 'Error updating reservation');
        }
    }

    static async updateReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const validateResult = validatePartialReservation(req.body);
            if (!validateResult.success) {
                badRequest(res, 'Validation failed', validateResult.error.format());
                return;
            }

            // Si solo viene el estado, usamos el método específico para eso
            if (Object.keys(validateResult.data).length === 1 && validateResult.data.status) {
                const updatedReservation = await ReservationService.updateReservation(parseInt(id), validateResult.data.status);
                res.status(200).json(updatedReservation);
                return;
            }

            const currentReservation = await ReservationService.getReservationById(parseInt(id));
            if (!currentReservation) {
                notFound(res, 'Reservation not found');
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
                badRequest(res, 'Missing required fields for calculation', { missingFields });
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
                        updateData.paymentStatus = 'completed';
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
                badRequest(res, 'No se pudo calcular un valor válido para total_amount');
                return;
            }

            if (isNaN(formattedData.amount_due) || formattedData.amount_due === undefined) {
                badRequest(res, 'No se pudo calcular un valor válido para amount_due');
                return;
            }

            const updatedReservation = await ReservationModel.updateReservation(parseInt(id), formattedData);
            ok(res, updatedReservation);
        } catch (error) {
            console.error('Error in updateReservation:', error);
            serverError(res, 'Error updating reservation');
        }
    }

    static async deleteReservation(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            // Verificar que la reserva existe
            const reservation = await ReservationService.getReservationById(parseInt(id));
            if (!reservation) {
                notFound(res, 'Reservation not found');
                return;
            }

            const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
            if (payments && payments.length > 0) {
                res.status(409).json({
                    error: 'Cannot delete reservation',
                    message: 'This reservation has associated payments and cannot be deleted. Please remove all payments first.',
                    paymentsCount: payments.length
                });
                return;
            }

            await ReservationService.deleteReservation(parseInt(id));
            ok(res, { message: 'Reservation deleted successfully' });
        } catch (error: any) {
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                res.status(409).json({
                    error: 'Cannot delete reservation',
                    message: 'This reservation has associated records and cannot be deleted.'
                });
                return;
            }

            console.error('Error deleting reservation:', error);
            serverError(res, 'Error deleting reservation');
        }
    }
    
    // Método para registrar pagos
    static async registerPayment(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const { amount, paymentMethod, paymentReference, notes } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            badRequest(res, 'Valid payment amount is required');
            return;
        }

        if (!paymentMethod) {
            badRequest(res, 'Payment method is required');
            return;
        }

        try {
            let receiptImage: string | null = null;
            if (req.file) {
                const result = await ImageService.uploadImages([req.file], { entityType: 'reservation_payments' });
                if (!result.success || result.urls.length === 0) {
                    serverError(res, 'Error uploading receipt image', result.errors);
                    return;
                }
                receiptImage = result.urls[0];
            }

            const updatedReservation = await ReservationService.registerPayment(
                parseInt(id),
                Number(amount),
                paymentMethod,
                paymentReference,
                notes,
                receiptImage
            );
            ok(res, updatedReservation);
        } catch (error: any) {
            console.error('Error in registerPayment:', error);
            serverError(res, error.message || 'Error registering payment');
        }
    }
    
    // Método para generar y enviar PDF
    static async generatePdf(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        
        try {
            const pdfPath = await ReservationService.generateAndSendPDF(parseInt(id));
            
            // Enviar respuesta con confirmación
            ok(res, { message: 'PDF generated and sent successfully', pdfPath });
        } catch (error) {
            serverError(res, 'Error generating PDF');
        }
    }

    static async downloadPdf(req: Request, res: Response): Promise<void> {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            badRequest(res, 'ID de reserva inválido');
            return;
        }

        try {
            const reservation = await ReservationService.getReservationById(parseInt(id));
            if (!reservation) {
                notFound(res, 'Reservation not found');
                return;
            }

            const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
            const pdfBuffer = await PdfService.generatePdfForDownload(reservation, payments);

            if (!pdfBuffer || pdfBuffer.length === 0) {
                serverError(res, 'Error generating PDF: Empty buffer');
                return;
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=reservation-${id}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.status(200).send(pdfBuffer);
        } catch (error: any) {
            serverError(res, 'Error generating PDF for download',
                process.env.NODE_ENV === 'development' ? error.message : undefined
            );
        }
    }

    static async getReservationPayments(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
            ok(res, payments);
        } catch (error) {
            serverError(res, 'Error fetching reservation payments');
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
                notFound(res, 'Reservation not found');
                return;
            }

            if (!reservationData.clientEmail) {
                badRequest(res, 'The reservation does not have a client email associated');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(reservationData.clientEmail)) {
                badRequest(res, 'Invalid email format');
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
                    // Validar que existan pagos registrados
                    const payments = await ReservationPaymentsService.getPaymentsByReservation(parseInt(id));
                    
                    if (!payments || payments.length === 0) {
                        badRequest(res, 'Cannot send payment notifications without registered payments',
                            'Please register at least one payment before sending the notification'
                        );
                        return;
                    }

                    // Obtener el último pago registrado
                    const lastPayment = payments[0];
                    
                    // Determinar si el pago está completo basándose en el monto pendiente
                    const isPaymentComplete = Number(reservationData.amountDue) <= 0;

                    // Enviar notificación de pago (funciona para pagos parciales y completos)
                    await EmailService.sendPaymentNotification(
                        reservationData,
                        lastPayment.amount,
                        isPaymentComplete
                    );
                    break;
                default:
                    badRequest(res, 'Invalid notification type');
                    return;
            }

            ok(res, { success: true, message: 'Notification sent successfully' });
        } catch (error) {
            console.error('Error sending notification:', error);
            serverError(res, 'Error sending notification');
        }
    }
}
