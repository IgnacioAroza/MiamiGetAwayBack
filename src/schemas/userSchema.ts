import { z } from 'zod';

export const userSchema = z.object({
    name: z.string().min(1, "Name is mandatory"),
    lastname: z.string().min(1, "Lastname is mandatory"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    notes: z.string().optional()
});

export type User = z.infer<typeof userSchema>;
export type PartialUser = Partial<User>;

export function validateUser(object: unknown): z.SafeParseReturnType<User, User> {
    return userSchema.safeParse(object);
}

export function validatePartialUser(object: unknown): z.SafeParseReturnType<unknown, Partial<User>> {
    return userSchema.partial().safeParse(object);
}