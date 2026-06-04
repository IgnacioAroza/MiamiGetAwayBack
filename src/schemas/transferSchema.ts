import { z } from 'zod';

const VEHICLE_CATEGORIES = ['sedan', 'suv', 'van'] as const;
const SERVICE_TYPES = ['airport_transfer', 'business_travel', 'sports_events', 'private_events', 'yacht_transfer', 'video_film_production', 'hourly'] as const;
const INQUIRY_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;

export const vehicleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.enum(VEHICLE_CATEGORIES),
    capacity: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive('Capacity must be a positive integer')
    ),
    luggage_capacity: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().min(0, 'Luggage capacity must be 0 or more')
    ),
    description: z.string().optional().nullable(),
    images: z.array(z.string().url()).optional(),
});

export const inquirySchema = z.object({
    vehicle_id: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive().nullable().optional()
    ),
    pick_up: z.string().min(1, 'Pick up location is required'),
    drop_off: z.string().min(1, 'Drop off location is required'),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    passengers: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive('Passengers must be a positive integer')
    ),
    luggage_large: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? 0 : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().min(0).default(0)
    ),
    luggage_medium: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? 0 : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().min(0).default(0)
    ),
    luggage_carry_on: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? 0 : typeof val === 'string' ? parseInt(val) : val),
        z.number().int().min(0).default(0)
    ),
    service_type: z.enum(SERVICE_TYPES),
    client_name: z.string().min(1, 'Client name is required'),
    client_email: z.string().email('Invalid email address'),
    client_phone: z.string().min(1, 'Client phone is required'),
    notes: z.string().optional().nullable(),
});

export const inquiryStatusSchema = z.object({
    status: z.enum(INQUIRY_STATUSES),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;

export function validateVehicle(object: unknown) {
    return vehicleSchema.safeParse(object);
}

export function validatePartialVehicle(object: unknown) {
    return vehicleSchema.partial().safeParse(object);
}

export function validateInquiry(object: unknown) {
    return inquirySchema.safeParse(object);
}

export function validateInquiryStatus(object: unknown) {
    return inquiryStatusSchema.safeParse(object);
}
