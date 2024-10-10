import { z } from 'zod'

export const carSchema = z.object({
    brand: z.string().min(1, "Brand is mandatory"),
    model: z.string().min(1, "Model is mandatory"),
    description: z.string().optional(),
    price: z.number().positive('Price must be positive number'),
    images: z.array(z.string().url()).optional()
})

export function validateCar(object) {
    return carSchema.safeParse(object);
}

export function validatePartialCar(object) {
    return carSchema.partial().safeParse(object);
}