import { z } from 'zod';

export const userSchema = z.object({
    name: z.string().min(1, "Name is mandatory"),
    lastname: z.string().min(1, "Lastname is mandatory"),
    email: z.string().email("Invalid email format")
});

export type User = z.infer<typeof userSchema>;
export type PartialUser = Partial<User>;

export function validateUser(object: unknown): z.SafeParseReturnType<User, User> {
    return userSchema.safeParse(object);
}

export function validatePartialUser(object: unknown): z.SafeParseReturnType<unknown, Partial<User>> {
    return userSchema.partial().safeParse(object);
}