// Para apartamentos
export interface Apartment {
    id: number;
    name: string;
    description?: string;
    address: string;
    capacity: number;
    bathrooms: number;
    rooms: number;
    price: number;
    unitNumber: string;
    images: string[];    
}

// Para crear (sin ID)
export interface CreateApartmentDTO {
    name: string;
    description?: string;
    address: string;
    capacity: number;
    bathrooms: number;
    rooms: number;
    price: number;
    unitNumber: string;
    images: string[];
}

// Para actualizar (campos opcionales)
export interface UpdateApartmentDTO {
    name?: string;
    description?: string;
    address?: string;
    capacity?: number;
    bathrooms?: number;
    rooms?: number;
    price?: number;
    unitNumber?: string;
    images?: string[];
}
