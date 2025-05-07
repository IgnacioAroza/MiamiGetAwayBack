import { z } from 'zod';

// Expresión regular para validar el formato MM-DD-YYYY HH:mm
const dateTimeRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4} (0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;

// Esquema para validar fechas en formato string MM-DD-YYYY HH:mm
const dateSchema = z.string().refine(val => dateTimeRegex.test(val), {
    message: "Must be a valid date in format MM-DD-YYYY HH:mm"
});

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
    createdAt: dateSchema.optional().default(() => {
        // Formatear la fecha actual en formato MM-DD-YYYY HH:mm
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        return `${month}-${day}-${year} ${hours}:${minutes}`;
    })
});

export type Reservation = z.infer<typeof reservationSchema>;
export type PartialReservation = Partial<Reservation>;

export function validateReservation(object: unknown) {
    return reservationSchema.safeParse(object);
}

export function validatePartialReservation(object: unknown) {
    return reservationSchema.partial().safeParse(object);
}

// Función auxiliar para convertir el formato MM-DD-YYYY HH:mm a objeto Date cuando sea necesario
export function parseReservationDate(dateString: string): Date {
    // Formato: MM-DD-YYYY HH:mm
    const [datePart, timePart] = dateString.split(' ');
    const [month, day, year] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    return new Date(year, month - 1, day, hours, minutes);
}
