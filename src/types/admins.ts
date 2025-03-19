//Para admin
export interface Admin {
    id: number;
    username: string;
    email: string;
    password: string;
}

// Para crear (sin ID)
export interface CreateAdminDTO {
    username: string;
    email: string;
    password: string;
}   

// Para actualizar (campos opcionales)
export interface UpdateAdminDTO {
    username?: string;
    email?: string;
    password?: string;
}