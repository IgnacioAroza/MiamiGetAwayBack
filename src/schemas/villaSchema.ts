import { z } from 'zod';

export const villaSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    capacity: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().positive("Capacity must be a positive number")
    ),
    bathrooms: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().positive("Number of bathrooms must be positive")
    ),
    rooms: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().positive("Number of rooms must be positive")
    ),
    price: z.preprocess(
        (val) => (typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive("Price must be a positive number")
    ),
    images: z.array(z.string().url()).default([])
});

export type Villa = z.infer<typeof villaSchema>;
export type PartialVilla = Partial<Villa>;

export function validateVilla(object: unknown): z.SafeParseReturnType<Villa, Villa> {
    return villaSchema.safeParse(object);
}

export function validatePartialVilla(object: unknown): z.SafeParseReturnType<unknown, Partial<Villa>> {
    return villaSchema.partial().safeParse(object);
}