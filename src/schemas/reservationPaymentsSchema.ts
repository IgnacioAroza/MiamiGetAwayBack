import { z } from 'zod';

export const reservationPaymentSchema = z.object({
    reservationId: z.number().positive("Reservation ID must be a positive number"),
    amount: z.number().positive("Amount must be a positive number"),
    paymentDate: z.date(),
    paymentMethod: z.enum(["efectivo", "transferencia", "tarjeta"]),
    paymentReference: z.string().optional(),
    notes: z.string().optional(),
});

export type ReservationPayment = z.infer<typeof reservationPaymentSchema>;

export type PartialReservationPayment = Partial<ReservationPayment>;

export function validateReservationPayment(object: unknown): z.SafeParseReturnType<ReservationPayment, ReservationPayment> {
    return reservationPaymentSchema.safeParse(object);
}

export function validatePartialReservationPayment(object: unknown): z.SafeParseReturnType<PartialReservationPayment, PartialReservationPayment> {
    return reservationPaymentSchema.partial().safeParse(object);
}
