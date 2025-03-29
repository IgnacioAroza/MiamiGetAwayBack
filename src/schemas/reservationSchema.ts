import { z } from 'zod';

const dateSchema = z.union([
    z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Debe ser una fecha válida en formato ISO"
    }).transform(val => new Date(val)),
    z.date()
]);

export const reservationSchema = z.object({
    apartmentId: z.number().positive("Apartment ID must be a positive number"),
    clientId: z.number().positive("Client ID must be a positive number"),
    checkInDate: dateSchema,
    checkOutDate: dateSchema,
    nights: z.number().positive("Nights must be a positive number"),
    pricePerNight: z.number().positive("Price per night must be a positive number"),
    cleaningFee: z.number().positive("Cleaning fee must be a positive number"),
    otherExpenses: z.number().positive("Other expenses must be a positive number"),
    taxes: z.number().positive("Taxes must be a positive number"),
    totalAmount: z.number().positive("Total amount must be a positive number"),
    amountPaid: z.number().positive("Amount paid must be a positive number"),
    amountDue: z.number().positive("Amount due must be a positive number"),
    parkingFee: z.number().positive("Parking fee must be a positive number"),
    status: z.enum(["pending", "confirmed", "checked_in", "checked_out"]),
    paymentStatus: z.enum(["pending", "partial", "complete"]),
    createdAt: dateSchema.default(() => new Date())
});

export type Reservation = z.infer<typeof reservationSchema>;
export type PartialReservation = Partial<Reservation>;

export function validateReservation(object: unknown) {
    return reservationSchema.safeParse(object);
}

export function validatePartialReservation(object: unknown) {
    return reservationSchema.partial().safeParse(object);
}
