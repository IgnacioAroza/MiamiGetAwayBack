import { z } from 'zod';

export const carSchema = z.object({
    brand: z.string().min(1, "Brand is mandatory"),
    model: z.string().min(1, "Model is mandatory"),
    description: z.string().optional(),
    price: z.preprocess(
        (val) => (typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive("Price must be a positive number").multipleOf(0.01, "Price must have 2 decimal places or less")
    ),
    passengers: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive("Passengers must be a positive integer").optional()
    ),
    images: z.array(z.string().url()).optional()
});

// Infiere el tipo de datos a partir del schema
export type Car = z.infer<typeof carSchema>;
export type PartialCar = Partial<Car>;

export function validateCar(object: unknown): z.SafeParseReturnType<Car, Car> {
    return carSchema.safeParse(object);
}

export function validatePartialCar(object: unknown): z.SafeParseReturnType<unknown, Partial<Car>> {
    return carSchema.partial().safeParse(object);
}

// Schema para filtros de cars
export const carFiltersSchema = z.object({
    minPrice: z.preprocess(
        (val) => (typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive("minPrice must be a positive number").optional()
    ),
    maxPrice: z.preprocess(
        (val) => (typeof val === 'string' ? parseFloat(val) : val),
        z.number().positive("maxPrice must be a positive number").optional()
    ),
    passengers: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val) : val),
        z.number().int().positive("passengers must be a positive integer").optional()
    ),
}).refine((data) => {
    if (data.minPrice && data.maxPrice) {
        return data.minPrice <= data.maxPrice;
    }
    return true;
}, {
    message: "minPrice must be less than or equal to maxPrice"
});

export type CarFilters = z.infer<typeof carFiltersSchema>;

export function validateCarFilters(object: unknown): z.SafeParseReturnType<CarFilters, CarFilters> {
    return carFiltersSchema.safeParse(object);
}