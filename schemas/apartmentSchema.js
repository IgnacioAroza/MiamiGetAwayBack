import { z } from 'zod'

export const apartmentSchema = z.object({
    name: z.string().min(1, "Name is mandatory"),
    description: z.string().optional(),
    address: z.string().min(1, "Address is mandatory"),
    capacity: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().positive("Price must be a positive number")
    ),
    price: z.preprocess(
        (val) => (typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive("Price must be a positive number")
    ),
    images: z.array(z.string().url()).optional()
})

export function validateApartment(object) {
    return apartmentSchema.safeParse(object);
}

export function validatePartialApartment(object) {
    return apartmentSchema.partial().safeParse(object);
}