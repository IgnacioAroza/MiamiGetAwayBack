import { z } from 'zod';

export const reservationSchema = z.object({
    apartmentId: z.string().uuid(),
    clientId: z.string().uuid(),
    checkInDate: z.date(),
    checkOutDate: z.date(),
    nights: z.number().positive("Nights must be a positive number"),
    pricePerNight: z.number().positive("Price per night must be a positive number"),
    cleaningFee: z.number().positive("Cleaning fee must be a positive number"),
    otherExpenses: z.number().positive("Other expenses must be a positive number"),
    taxes: z.number().positive("Taxes must be a positive number"),
    totalAmount: z.number().positive("Total amount must be a positive number"),
    amountPaid: z.number().positive("Amount paid must be a positive number"),
    amountDue: z.number().positive("Amount due must be a positive number"),
    parkingFee: z.number().positive("Parking fee must be a positive number"),
    status: z.enum(["pendiente", "confirmada", "en contrato", "cerrada"]),
    paymentStatus: z.enum(["pendiente", "parcial", "completo"]),
});

export type Reservation = z.infer<typeof reservationSchema>;
export type PartialReservation = Partial<Reservation>;

export function validateReservation(object: unknown): z.SafeParseReturnType<Reservation, Reservation> {
    return reservationSchema.safeParse(object);
}

export function validatePartialReservation(object: unknown): z.SafeParseReturnType<PartialReservation, PartialReservation> {
    return reservationSchema.partial().safeParse(object);
}
