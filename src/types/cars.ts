// Para autos
export interface Cars {
    id: number;
    brand: string;
    model: string;
    description?: string;
    price: number;
    images: string[];
}

// Para crear (sin ID)
export interface CreateCarsDTO {
    brand: string;
    model: string;
    description?: string;
    price: number;
    images: string[];
}

// Para actualizar (campos opcionales)
export interface UpdateCarsDTO {
    brand?: string;
    model?: string;
    description?: string;
    price?: number;
    images?: string[];
}
