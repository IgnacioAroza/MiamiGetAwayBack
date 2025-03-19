//Para yates
export interface Yacht {
    id: number;
    name: string;
    description?: string;
    capacity: number;
    price: number;
    images: string[];
}

// Para crear (sin ID)
export interface CreateYachtDTO {
    name: string;
    description?: string;
    capacity: number;
    price: number;
    images: string[];
}

// Para actualizar (campos opcionales)
export interface UpdateYachtDTO {
    name?: string;
    description?: string;
    capacity?: number;
    price?: number;
    images?: string[];
}