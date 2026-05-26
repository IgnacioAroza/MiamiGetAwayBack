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
    paymentTerms?: string | null;
    createdAt: Date;
    // Computed fields (returned by JOIN queries)
    supplierName?: string;
    supplierCompany?: string | null;
    supplierEmail?: string | null;
    supplierPhone?: string | null;
    totalPayout?: number;
    totalPaid?: number;
    balance?: number;
}

export interface AssignSupplierDTO {
    supplierId: number;
    payoutPerNight: number;
    paymentTerms?: string;
}

export interface SupplierPayment {
    id: number;
    reservationSupplierId: number;
    amount: number;
    method: 'cash' | 'wire' | 'card' | 'transfer';
    date: Date;
    referenceNotes?: string | null;
    receiptImages: string[];
    createdAt: Date;
}

export interface CreateSupplierPaymentDTO {
    reservationSupplierId: number;
    amount: number;
    method: 'cash' | 'wire' | 'card' | 'transfer';
    date: string;
    referenceNotes?: string;
    receiptImages?: string[];
}

export interface UpdateSupplierPaymentDTO {
    amount?: number;
    method?: 'cash' | 'wire' | 'card' | 'transfer';
    date?: string;
    referenceNotes?: string | null;
    receiptImages?: string[];
}
