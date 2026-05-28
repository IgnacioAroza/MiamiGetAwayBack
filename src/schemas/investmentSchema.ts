import { z } from 'zod';

export const investmentSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    unit_number: z.string().optional().nullable(),
    address: z.string().min(1, 'Address is required'),
    description: z.string().optional().nullable(),
    bathrooms: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().int().nonnegative('Bathrooms must be a non-negative integer')
    ),
    rooms: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive('Rooms must be a positive integer')
    ),
    price: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive('Price must be a positive number').nullable().optional()
    ),
    images: z.array(z.string().url()).optional(),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;

export function validateInvestment(object: unknown) {
    return investmentSchema.safeParse(object);
}

export function validatePartialInvestment(object: unknown) {
    return investmentSchema.partial().safeParse(object);
}
