import { z } from 'zod';

export const apartmentSchema = z.object({
    name: z.string().min(1, "Name is mandatory"),
    description: z.string().optional(),
    address: z.string().min(1, "Address is mandatory"),
    capacity: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().positive("Capacity must be a positive number")
    ),
    bathrooms: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().positive("bathrooms must be a positive number")
    ),
    rooms: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().min(0, "Rooms must be at least 0")
    ),
    price: z.preprocess(
        (val) => (typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive("Price must be a positive number")
    ),
    unitNumber: z.string().min(1, "Unit number is mandatory"),
    images: z.array(z.string().url()).optional()
});

// Infiere el tipo de datos a partir del schema
export type Apartment = z.infer<typeof apartmentSchema>;
export type PartialApartment = Partial<Apartment>;

export function validateApartment(object: unknown): z.SafeParseReturnType<Apartment, Apartment> {
    return apartmentSchema.safeParse(object);
}

export function validatePartialApartment(object: unknown): z.SafeParseReturnType<unknown, Partial<Apartment>> {
    return apartmentSchema.partial().safeParse(object);
}
