import { z } from 'zod'

export const carSchema = z.object({
    brand: z.string().min(1, "Brand is mandatory"),
    model: z.string().min(1, "Model is mandatory"),
    description: z.string().optional(),
    price: z.preprocess(
        (val) => (typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive("Price must be a positive number")
    ),
    images: z.array(z.string().url()).optional()
})

export function validateCar(object) {
    return carSchema.safeParse(object);
}

export function validatePartialCar(object) {
    return carSchema.partial().safeParse(object);
}