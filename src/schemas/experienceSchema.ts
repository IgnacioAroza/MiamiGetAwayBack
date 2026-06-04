import { z } from 'zod';

export const experienceSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    capacity: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive('Capacity must be a positive integer').nullable().optional()
    ),
    price: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive('Price must be a positive number').nullable().optional()
    ),
    images: z.array(z.string().url()).optional(),
});

export const inquirySchema = z.object({
    experience_id: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive().nullable().optional()
    ),
    name: z.string().min(1, 'Name is required'),
    lastname: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional().nullable(),
});

export const inquiryStatusSchema = z.object({
    status: z.enum(['pending', 'contacted', 'closed']),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;

export function validateExperience(object: unknown) {
    return experienceSchema.safeParse(object);
}

export function validatePartialExperience(object: unknown) {
    return experienceSchema.partial().safeParse(object);
}

export function validateInquiry(object: unknown) {
    return inquirySchema.safeParse(object);
}

export function validateInquiryStatus(object: unknown) {
    return inquiryStatusSchema.safeParse(object);
}
