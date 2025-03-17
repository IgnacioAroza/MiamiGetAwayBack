import { z } from 'zod';

export const yachtSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    capacity: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val);
                return isNaN(parsed) ? val : parsed;
            }
            return val;
        },
        z.number().positive("Capacity must be a positive number")
    ),
    price: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? val : parsed;
            }
            return val;
        },
        z.number().positive("Price must be a positive number")
    ),
    images: z.array(z.string()).optional()
});

export type Yacht = z.infer<typeof yachtSchema>;
export type PartialYacht = Partial<Yacht>;

export function validateYacht(object: unknown): z.SafeParseReturnType<Yacht, Yacht> {
    return yachtSchema.safeParse(object);
}

export function validatePartialYacht(object: unknown): z.SafeParseReturnType<unknown, Partial<Yacht>> {
    return yachtSchema.partial().safeParse(object);
}