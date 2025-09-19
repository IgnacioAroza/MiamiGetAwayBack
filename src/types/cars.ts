// Para autos
export interface Cars {
    id: number;
    brand: string;
    model: string;
    description?: string;
    price: number;
    passengers?: number; // Número de asientos/pasajeros
    images: string[];
}

// Para crear (sin ID)
export interface CreateCarsDTO {
    brand: string;
    model: string;
    description?: string;
    price: number;
    passengers?: number; // Número de asientos/pasajeros
    images: string[];
}

// Para actualizar (campos opcionales)
export interface UpdateCarsDTO {
    brand?: string;
    model?: string;
    description?: string;
    price?: number;
    passengers?: number; // Número de asientos/pasajeros
    images?: string[];
}

// Para filtros de búsqueda
export interface CarFilters {
    minPrice?: number;
    maxPrice?: number;
    passengers?: number;
}
