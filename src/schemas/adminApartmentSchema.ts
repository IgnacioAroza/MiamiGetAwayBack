import { z } from 'zod';

export const adminApartmentSchema = z.object({
    buildingName: z.string().min(1, "Building name is mandatory"),
    unitNumber: z.string().min(1, "Unit number is mandatory"),
    distribution: z.string().min(1, "Distribution is mandatory"),
    description: z.string().optional(),
    address: z.string().min(1, "Address is mandatory"),
    capacity: z.number().positive("Capacity must be a positive number"),
    pricePerNight: z.number().positive("Price per night must be a positive number"),
    cleaningFee: z.number().positive("Cleaning fee must be a positive number"),
    images: z.array(z.string().url()).optional(),
});

export type AdminApartment = z.infer<typeof adminApartmentSchema>;
export type PartialAdminApartment = Partial<AdminApartment>;

export function validateApartment(object: unknown): z.SafeParseReturnType<AdminApartment, AdminApartment> {
    return adminApartmentSchema.safeParse(object);
}

export function validatePartialApartment(object: unknown): z.SafeParseReturnType<PartialAdminApartment, PartialAdminApartment> {
    return adminApartmentSchema.partial().safeParse(object);
}
