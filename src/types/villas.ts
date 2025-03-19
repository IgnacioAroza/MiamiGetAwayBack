//Para villas
export interface Villa {
    id: number;
    name: string;
    description?: string;
    address: string;
    capacity: number;
    bathrooms: number;
    rooms: number;
    price: number;
    images: string[];
}

// Para crear (sin ID)
export interface CreateVillaDTO {
    name: string;
    description?: string;
    address: string;
    capacity: number;
    bathrooms: number;
    rooms: number;
    price: number;
    images: string[];
}

// Para actualizar (campos opcionales)
export interface UpdateVillaDTO {
    name?: string;
    description?: string;
    address?: string;
    capacity?: number;
    bathrooms?: number;
    rooms?: number;
    price?: number;
    images?: string[];
}