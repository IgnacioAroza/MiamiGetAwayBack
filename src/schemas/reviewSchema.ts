import { z } from 'zod';

export const reviewSchema = z.object({
    name: z.string().min(1, "Name is mandaatory"),
    comment: z.string().min(1, 'Comment is required').max(500, 'Comment must be 500 characters or less'),
});

export type Review = z.infer<typeof reviewSchema>;
export type PartialReview = Partial<Review>;

export function validateReview(object: unknown): z.SafeParseReturnType<Review, Review> {
    return reviewSchema.safeParse(object);
}

export function validatePartialReview(object: unknown): z.SafeParseReturnType<unknown, Partial<Review>> {
    return reviewSchema.partial().safeParse(object);
}