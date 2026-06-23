export interface Supplier {
    id: number;
    name: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    createdAt: Date;
}

export interface CreateSupplierDTO {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
}

export interface UpdateSupplierDTO {
    name?: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
}

export interface ReservationSupplier {
    id: number;
    reservationId: number;
    supplierId: number;
    payoutPerNight: number;
    cleaningFee: number;
    paymentTerms?: string | null;
    createdAt: Date;
    // Raw JOIN fields (internal use)
    supplierIdRef?: number;
    supplierName?: string;
    supplierCompany?: string | null;
    supplierEmail?: string | null;
    supplierPhone?: string | null;
    totalPayout?: number;
    totalPaid?: number;
    balance?: number;
    totalRevenue?: number;
}

export interface ReservationSupplierResponse {
    id: number;
    reservation_id: number;
    supplier: {
        id: number;
        name: string;
        company?: string | null;
        email?: string | null;
        phone?: string | null;
    };
    payout_per_night: number;
    cleaning_fee: number;
    payment_terms?: string | null;
    calculated: {
        total: number;
        paid: number;
        balance: number;
        profit: number;
    };
}

export interface AssignSupplierDTO {
    supplier_id: number;
    payout_per_night: number;
    cleaning_fee?: number;
    payment_terms?: string;
}

export interface SupplierPayment {
    id: number;
    reservationSupplierId: number;
    amount: number;
    method: 'cash' | 'card' | 'transfer' | 'paypal' | 'zelle' | 'stripe' | 'other';
    date: Date;
    referenceNotes?: string | null;
    receiptImages: string[];
    createdAt: Date;
}

export interface CreateSupplierPaymentDTO {
    reservationSupplierId: number;
    amount: number;
    method: 'cash' | 'card' | 'transfer' | 'paypal' | 'zelle' | 'stripe' | 'other';
    date: string;
    referenceNotes?: string;
    receiptImages?: string[];
}

export interface UpdateSupplierPaymentDTO {
    amount?: number;
    method?: 'cash' | 'card' | 'transfer' | 'paypal' | 'zelle' | 'stripe' | 'other';
    date?: string;
    referenceNotes?: string | null;
    receiptImages?: string[];
}
