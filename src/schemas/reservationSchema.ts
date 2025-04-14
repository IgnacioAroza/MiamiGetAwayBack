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
    cleaningFee: z.number().min(0, "Cleaning fee must be a non-negative number"),
    otherExpenses: z.number().min(0, "Other expenses must be a non-negative number"),
    taxes: z.number().min(0, "Taxes must be a non-negative number"),
    totalAmount: z.number().min(0, "Total amount must be a non-negative number"),
    amountPaid: z.number().min(0, "Amount paid must be a non-negative number"),
    amountDue: z.number().min(0, "Amount due must be a non-negative number"),
    parkingFee: z.number().min(0, "Parking fee must be a non-negative number"),
    status: z.enum(["pending", "confirmed", "checked_in", "checked_out"]),
    paymentStatus: z.enum(["pending", "partial", "complete"]),
    notes: z.string().optional(),
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
