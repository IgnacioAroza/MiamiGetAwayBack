import { Request, Response, NextFunction } from 'express'

export * from './apartment.js'
export * from './villas.js'
export * from './cars.js'
export * from './yachts.js'
export * from './admins.js'
export * from './reviews.js'
export * from './clients.js'
export * from './adminApartments.js'
export * from './reservations.js'
export * from './reservationPayments.js'

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
