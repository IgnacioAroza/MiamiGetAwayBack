import { z } from 'zod'

export const yachtSchema = z.object({
    name: z.string().min(1, "Name is mandatory"),
    description: z.string().optional(),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    price: z.number().positive("Price must be a positive number"),
    images: z.array(z.string().url()).optional()
})

export function validateYacht(object) {
    return yachtSchema.safeParse(object);
}

export function validatePartialYacht(object) {
    return yachtSchema.partial().safeParse(object);
} 