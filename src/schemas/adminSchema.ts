import { z } from 'zod';

export const adminSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters long"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters long")
});

export type Admin = z.infer<typeof adminSchema>;
export type PartialAdmin = Partial<Admin>;

export function validateAdmin(object: unknown): z.SafeParseReturnType<Admin, Admin> {
    return adminSchema.safeParse(object);
}

export function validatePartialAdmin(object: unknown): z.SafeParseReturnType<unknown, Partial<Admin>> {
    return adminSchema.partial().safeParse(object);
}