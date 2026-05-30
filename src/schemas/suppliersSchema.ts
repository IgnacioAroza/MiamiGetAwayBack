import { z } from 'zod';

export const supplierSchema = z.object({
    name: z.string().min(1),
    company: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional()
});

export const partialSupplierSchema = supplierSchema.partial();

export const assignSupplierSchema = z.object({
    supplier_id: z.number().int().positive(),
    payout_per_night: z.number().positive(),
    cleaning_fee: z.number().min(0).optional().default(0),
    payment_terms: z.string().optional()
});

const supplierPaymentMethodEnum = z.enum(['cash', 'wire', 'card', 'transfer']);

export const supplierPaymentSchema = z.object({
    reservationSupplierId: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive(),
    method: supplierPaymentMethodEnum,
    date: z.string().min(1),
    referenceNotes: z.string().optional(),
    receiptImages: z.array(z.string()).optional()
});

export const partialSupplierPaymentSchema = supplierPaymentSchema
    .omit({ reservationSupplierId: true })
    .partial();

export function validateSupplier(data: unknown) {
    return supplierSchema.safeParse(data);
}

export function validatePartialSupplier(data: unknown) {
    return partialSupplierSchema.safeParse(data);
}

export function validateAssignSupplier(data: unknown) {
    return assignSupplierSchema.safeParse(data);
}

export function validateSupplierPayment(data: unknown) {
    return supplierPaymentSchema.safeParse(data);
}

export function validatePartialSupplierPayment(data: unknown) {
    return partialSupplierPaymentSchema.safeParse(data);
}
