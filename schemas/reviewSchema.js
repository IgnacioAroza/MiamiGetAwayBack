import { z } from 'zod'

export const reviewSchema = z.object({
    name: z.string().min(1, "Name is mandaatory"),
    comment: z.string().min(1, 'Comment is required').max(500, 'Comment must be 500 characters or less'),
})

export function validateReview(object) {
    return reviewSchema.safeParse(object);
}

export function validatePartialReview(object) {
    return reviewSchema.partial().safeParse(object);
}