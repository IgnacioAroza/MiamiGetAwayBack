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
export const userFiltersSchema = z.object({
    name: z.string().trim().min(1, "Name filter must not be empty").optional(),
    lastname: z.string().trim().min(1, "Lastname filter must not be empty").optional(),
    email: z.string().trim().min(1, "Email filter must not be empty").optional(),
    phone: z.string().trim().min(1, "Phone filter must not be empty").optional()
});

export type UserFilters = z.infer<typeof userFiltersSchema>;

export function validateUser(object: unknown): z.SafeParseReturnType<User, User> {
    return userSchema.safeParse(object);
}

export function validatePartialUser(object: unknown): z.SafeParseReturnType<unknown, Partial<User>> {
    return userSchema.partial().safeParse(object);
}

export function validateUserFilters(object: unknown): z.SafeParseReturnType<UserFilters, UserFilters> {
    return userFiltersSchema.safeParse(object);
}
