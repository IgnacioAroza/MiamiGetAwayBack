export interface Investment {
    id?: number;
    name: string;
    unit_number?: string | null;
    address: string;
    description?: string | null;
    bathrooms: number;
    rooms: number;
    price?: number | null;
    images?: string[];
    created_at?: Date;
}

export type CreateInvestmentDTO = Omit<Investment, 'id' | 'created_at'>;
export type UpdateInvestmentDTO = Partial<CreateInvestmentDTO>;
