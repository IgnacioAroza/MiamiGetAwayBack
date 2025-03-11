import { Request, Response, NextFunction } from 'express'

// Para autenticación
export interface AuthResponse extends Response {
    user?: {
        id: string,
        email: string,
        role: string,
    }
}

// Para respuestas de base de datos
export interface DatabaseError {
    rows: any[],
    rowCount: number,
}

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
    images?: string[];
}

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



//Para admin
export interface Admin {
    id: number;
    username: string;
    email: string;
    password: string;
}

// Para crear (sin ID)
export interface CreateAdminDTO {
    username: string;
    email: string;
    password: string;
}   

// Para actualizar (campos opcionales)
export interface UpdateAdminDTO {
    username?: string;
    email?: string;
    password?: string;
}


//Para reviews
export interface Review {
    id: number;
    name: string;
    comment: string;
}

// Para crear (sin ID)
export interface CreateReviewDTO {
    name: string;
    comment: string;
}

// Para actualizar (campos opcionales)
export interface UpdateReviewDTO {
    name?: string;
    comment?: string;
}

//Para clientes
export interface Client {
    id: number;
    name: string;
    lastname: string;
    email: string;
}

// Para crear (sin ID)
export interface CreateClientDTO {
    name: string;
    lastname: string;
    email: string;
}   

// Para actualizar (campos opcionales)
export interface UpdateClientDTO {
    name?: string;
    lastname?: string;
    email?: string;
}
