import { z } from 'zod';

export const monthlySummarySchema = z.object({
    month: z.number()
        .min(1, "The month must be between 1 and 12")
        .max(12, "The month must be between 1 and 12"),
    year: z.number()
        .min(2000, "The year must be greater than 2000")
        .max(2100, "The year must be less than 2100"),
    totalReservations: z.number()
        .min(0, "The total of reservations must be a positive number")
        .default(0),
    totalPayments: z.number()
        .min(0, "The total of payments must be a positive number")
        .default(0),
    totalRevenue: z.number()
        .min(0, "The total of revenue must be a positive number")
        .default(0),
});

export type MonthlySummary = z.infer<typeof monthlySummarySchema>;
export type PartialMonthlySummary = Partial<MonthlySummary>;

export function validateMonthlySummary(object: unknown) {
    return monthlySummarySchema.safeParse(object);
}

export function validatePartialMonthlySummary(object: unknown) {
    return monthlySummarySchema.partial().safeParse(object);
}