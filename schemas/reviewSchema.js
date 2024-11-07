import { z } from 'zod'

export const reviewSchema = z.object({
    name: z.string().min(1, "Name is mandaatory"),
    lastName: z.string().min(1, "Lastname is mandatory"),
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
    comment: z.string().min(1, 'Comment is required').max(500, 'Comment must be 500 characters or less'),
})

export function validateReview(object) {
    return reviewSchema.safeParse(object);
}

export function validatePartialReview(object) {
    return reviewSchema.partial().safeParse(object);
}