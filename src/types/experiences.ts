export interface Experience {
    id?: number;
    title: string;
    description?: string | null;
    capacity?: number | null;
    price?: number | null;
    images?: string[];
    created_at?: Date;
}

export type CreateExperienceDTO = Omit<Experience, 'id' | 'created_at'>;
export type UpdateExperienceDTO = Partial<CreateExperienceDTO>;

export type InquiryStatus = 'pending' | 'contacted' | 'closed';

export interface ExperienceInquiry {
    id?: number;
    experience_id?: number | null;
    name: string;
    lastname: string;
    email: string;
    phone?: string | null;
    status?: InquiryStatus;
    created_at?: Date;
}

export type CreateInquiryDTO = Omit<ExperienceInquiry, 'id' | 'status' | 'created_at'>;
