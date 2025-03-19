export interface Reservation {
    id: number;
    apartmentId: number;
    clientId: number;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
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
    status: 'pendiente' | 'confirmada' | 'en contrato' | 'cerrada';
    paymentStatus: 'pendiente' | 'parcial' | 'completo';
    createdAt: Date;
}

export interface CreateReservationDTO {
    apartmentId: number;
    clientId: number;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
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
    status: 'pendiente' | 'confirmada' | 'en contrato' | 'cerrada';
    paymentStatus: 'pendiente' | 'parcial' | 'completo';
}

export interface UpdateReservationDTO {
    apartmentId?: number;
    clientId?: number;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
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
    status?: 'pendiente' | 'confirmada' | 'en contrato' | 'cerrada';
    paymentStatus?: 'pendiente' | 'parcial' | 'completo';
}


