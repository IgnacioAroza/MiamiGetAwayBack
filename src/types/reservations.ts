export interface Reservation {
    id: number;
    apartmentId: number;
    clientId: number;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
    pricePerNight: number;
    cleaningFee: number;
    otherExpenses: number;
    taxes: number;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    parkingFee: number;
    status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out';
    paymentStatus: 'pending' | 'partial' | 'complete';
    createdAt: Date;
}

export interface ReservationWithClient extends Reservation {
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    clientCity?: string;
    clientCountry?: string;
    clientNotes?: string;
}

export interface CreateReservationDTO {
    apartmentId: number;
    clientId: number;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
    pricePerNight: number;
    cleaningFee: number;
    otherExpenses: number;
    taxes: number;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    parkingFee: number;
    status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out';
    paymentStatus: 'pending' | 'partial' | 'complete';
    createdAt: Date;
}

export interface UpdateReservationDTO {
    apartmentId?: number;
    clientId?: number;
    checkInDate?: Date;
    checkOutDate?: Date;
    nights?: number;
    pricePerNight?: number;
    cleaningFee?: number;
    otherExpenses?: number;
    taxes?: number;
    totalAmount?: number;
    amountPaid?: number;
    amountDue?: number;
    parkingFee?: number;
    status?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out';
    paymentStatus?: 'pending' | 'partial' | 'complete';
}


