export interface Reservation {
    id: number;
    apartmentId: number;
    clientId: number;
    checkInDate: string; // Cambiado de Date a string
    checkOutDate: string; // Cambiado de Date a string
    nights: number;
    pricePerNight: number;
    cleaningFee: number;
    otherExpenses: number;
    taxes: number;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    parkingFee: number;
    cancellationFee: number;
    status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
    paymentStatus: 'pending' | 'partial' | 'complete';
    notes?: string;
    createdAt: string; // Cambiado de Date a string
}

export interface ReservationWithClient extends Reservation {
    clientName?: string;
    clientLastname?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    clientCity?: string;
    clientCountry?: string;
    clientNotes?: string;
    apartmentName?: string;
    apartmentAddress?: string;
    apartmentDescription?: string;
}

export interface CreateReservationDTO {
    apartmentId: number;
    clientId: number;
    checkInDate: string; // Cambiado de Date a string
    checkOutDate: string; // Cambiado de Date a string
    nights: number;
    pricePerNight: number;
    cleaningFee: number;
    otherExpenses: number;
    taxes: number;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    parkingFee: number;
    cancellationFee: number;
    status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
    paymentStatus: 'pending' | 'partial' | 'complete';
    notes?: string;
    createdAt: string; // Cambiado de Date a string
}

export interface UpdateReservationDTO {
    apartmentId?: number;
    clientId?: number;
    checkInDate?: string; // Cambiado de Date a string
    checkOutDate?: string; // Cambiado de Date a string
    nights?: number;
    pricePerNight?: number;
    cleaningFee?: number;
    otherExpenses?: number;
    taxes?: number;
    totalAmount?: number;
    amountPaid?: number;
    amountDue?: number;
    parkingFee?: number;
    cancellationFee?: number;
    status?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
    paymentStatus?: 'pending' | 'partial' | 'complete';
    notes?: string;
}

