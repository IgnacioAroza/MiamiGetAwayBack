import { z } from 'zod'

export const userSchema = z.object({
    name: z.string().min(1, "Name is mandatory"),
    lastName: z.string().min(1, "Lastname is mandatory"),
    email: z.string().email("Invalid email format")
})

export function validateUser(object) {
    return userSchema.safeParse(object);
}

export function validatePartialUser(object) {
    return userSchema.partial().safeParse(object);
}