import { z } from 'zod';

const dateSchema = z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Debe ser una fecha válida en formato ISO"
    }).transform(val => new Date(val)),
    z.date()
]);

export const reservationPaymentSchema = z.object({
    reservationId: z.number().positive("Reservation ID must be a positive number"),
    amount: z.number().min(0, "Amount must be a positive number"),
    paymentDate: dateSchema,
    paymentMethod: z.enum(["card", "cash", "transfer", "paypal", "zelle", "stripe", "other"]),
    paymentReference: z.string().nullable().optional(),
    notes: z.string().optional(),
});

export type ReservationPayment = z.infer<typeof reservationPaymentSchema>;

export type PartialReservationPayment = Partial<ReservationPayment>;

export function validateReservationPayment(object: unknown) {
    return reservationPaymentSchema.safeParse(object);
}

export function validatePartialReservationPayment(object: unknown) {
    return reservationPaymentSchema.partial().safeParse(object);
}
