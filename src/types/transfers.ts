export type VehicleCategory = 'sedan' | 'suv' | 'van';

export type ServiceType =
    | 'airport_transfer'
    | 'business_travel'
    | 'sports_events'
    | 'private_events'
    | 'yacht_transfer'
    | 'video_film_production'
    | 'hourly';

export type InquiryStatus = 'pending' | 'confirmed' | 'cancelled';

export interface TransferVehicle {
    id?: number;
    name: string;
    category: VehicleCategory;
    capacity: number;
    luggage_capacity: number;
    description?: string | null;
    images?: string[];
    created_at?: Date;
}

export type CreateVehicleDTO = Omit<TransferVehicle, 'id' | 'created_at'>;
export type UpdateVehicleDTO = Partial<CreateVehicleDTO>;

export interface TransferInquiry {
    id?: number;
    vehicle_id?: number | null;
    pick_up: string;
    drop_off: string;
    date: string;
    time: string;
    passengers: number;
    luggage_large?: number;
    luggage_medium?: number;
    luggage_carry_on?: number;
    service_type: ServiceType;
    client_name: string;
    client_email: string;
    client_phone: string;
    notes?: string | null;
    status?: InquiryStatus;
    created_at?: Date;
}

export type CreateInquiryDTO = Omit<TransferInquiry, 'id' | 'status' | 'created_at'>;
