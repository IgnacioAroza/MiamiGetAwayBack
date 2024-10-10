import { z } from 'zod'

export const apartmentSchema = z.object({
    name: z.string().min(1, "Name is mandatory"),
    description: z.string().optional(),
    address: z.string().min(1, "Address is mandatory"),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    price: z.number().positive("Price must be a positive number"),
    images: z.array(z.string().url()).optional()
})

export function validateApartment(object) {
    return apartmentSchema.safeParse(object);
}

export function validatePartialApartment(object) {
    return apartmentSchema.partial().safeParse(object);
}