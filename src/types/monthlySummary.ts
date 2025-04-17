export interface MonthlySummary {
    id: number;
    month: number;
    year: number;
    totalReservations: number;
    totalPayments: number;
    totalRevenue: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateMonthlySummaryDTO {
    month: number;
    year: number;
    totalReservations: number;
    totalPayments: number;
    totalRevenue: number;
}

export interface UpdateMonthlySummaryDTO {
    totalReservations?: number;
    totalPayments?: number;
    totalRevenue?: number;
}
