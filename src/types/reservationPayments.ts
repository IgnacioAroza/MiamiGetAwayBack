export interface ReservationPayment {
    id: number;
    reservationId: number;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    paymentReference?: string;
    notes?: string;
}

export interface CreateReservationPaymentDTO {
    reservationId: number;
    amount: number;
    paymentMethod: string;
    paymentReference?: string;
    notes?: string;
    paymentDate?: Date;
}

export interface UpdateReservationPaymentDTO {
    amount?: number;
    paymentMethod?: string;
    paymentReference?: string;
    notes?: string;
}