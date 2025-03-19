//Para clientes
export interface Client {
    id: number;
    name: string;
    lastname: string;
    email: string;
}

// Para crear (sin ID)
export interface CreateClientDTO {
    name: string;
    lastname: string;
    email: string;
}   

// Para actualizar (campos opcionales)
export interface UpdateClientDTO {
    name?: string;
    lastname?: string;
    email?: string;
}
