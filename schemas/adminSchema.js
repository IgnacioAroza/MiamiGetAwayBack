import { z } from 'zod'

export const adminSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters long"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters long")
})

export function validateAdmin(object) {
    return adminSchema.safeParse(object);
}

export function validatePartialAdmin(object) {
    return adminSchema.partial().safeParse(object);
}