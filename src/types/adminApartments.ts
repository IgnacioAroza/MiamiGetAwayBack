export interface AdminApartment {
    id: number;
    buildingName: string;
    unitNumber: string;
    distribution: string;
    description?: string;
    address: string;
    capacity: number;
    pricePerNight: number;
    cleaningFee: number;
    images: string[];
}

export interface CreateAdminApartmentDTO {
    buildingName: string;
    unitNumber: string;
    distribution: string;
    description?: string;
    address: string;
    capacity: number;
    pricePerNight: number;
    cleaningFee: number;  
    images: string[];
}

export interface UpdateAdminApartmentDTO {
    buildingName?: string;
    unitNumber?: string;
    distribution?: string;
    description?: string;
    address?: string;
    capacity?: number;
    pricePerNight?: number;
    cleaningFee?: number;
    images?: string[];
}
