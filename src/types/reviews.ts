//Para reviews
export interface Review {
    id: number;
    name: string;
    comment: string;
}

// Para crear (sin ID)
export interface CreateReviewDTO {
    name: string;
    comment: string;
}

// Para actualizar (campos opcionales)
export interface UpdateReviewDTO {
    name?: string;
    comment?: string;
}