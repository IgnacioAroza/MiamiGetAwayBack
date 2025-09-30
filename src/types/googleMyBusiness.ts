// Tipos e interfaces para Google My Business Integration
// Manteniendo la arquitectura del proyecto

export interface GoogleOAuthTokens {
    id?: number;
    service: string;
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_at?: string;
    scope?: string;
    google_account_id?: string;
    google_email?: string;
    created_at?: string;
    updated_at?: string;
    last_used_at?: string;
}

export interface GoogleReview {
    id?: number;
    google_review_id: string;
    google_location_id: string;
    google_account_id: string;
    reviewer_name: string;
    reviewer_photo_url?: string;
    rating: number;
    comment?: string;
    google_create_time: string;
    google_update_time?: string;
    reply_comment?: string;
    reply_update_time?: string;
    sync_status: 'active' | 'deleted' | 'system';
    local_created_at?: string;
    local_updated_at?: string;
}

export interface GoogleBusinessInfo {
    name: string;
    title: string;
    storefrontAddress?: {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
        countryCode?: string;
    };
    phoneNumbers?: {
        primaryPhone?: string;
    };
    websiteUri?: string;
    categories?: Array<{
        displayName: string;
        categoryId: string;
    }>;
    regularHours?: {
        periods: Array<{
            openDay: string;
            openTime: string;
            closeDay: string;
            closeTime: string;
        }>;
    };
    metadata?: {
        placeId: string;
    };
}

export interface GoogleAccount {
    name: string;
    accountName: string;
    type: string;
    role: string;
    state: {
        status: string;
    };
}

export interface GoogleLocation {
    name: string;
    languageCode: string;
    storeCode: string;
    title: string;
    phoneNumbers: {
        primaryPhone: string;
    };
    categories: {
        primaryCategory: {
            displayName: string;
            categoryId: string;
        };
        additionalCategories: Array<{
            displayName: string;
            categoryId: string;
        }>;
    };
    storefrontAddress: {
        addressLines: string[];
        locality: string;
        administrativeArea: string;
        postalCode: string;
        countryCode: string;
    };
    websiteUri: string;
    regularHours: {
        periods: Array<{
            openDay: string;
            openTime: string;
            closeDay: string;
            closeTime: string;
        }>;
    };
    metadata: {
        placeId: string;
        mapsUri: string;
        newReviewUri: string;
    };
}

export interface AuthenticationStatus {
    isAuthenticated: boolean;
    hasValidTokens: boolean;
    accountEmail?: string;
    accountId?: string;
    lastSync?: string;
    tokenExpiresAt?: string;
    needsReauth?: boolean;
}

export interface SyncResult {
    success: boolean;
    reviewsCount: number;
    newReviews: number;
    updatedReviews: number;
    errors?: string[];
    lastSync: string;
}

// DTOs para requests/responses
export interface CreateGoogleReviewDTO {
    google_review_id: string;
    google_location_id: string;
    google_account_id: string;
    reviewer_name: string;
    reviewer_photo_url?: string;
    rating: number;
    comment?: string;
    google_create_time: string;
    google_update_time?: string;
    reply_comment?: string;
    reply_update_time?: string;
}

export interface SaveTokensDTO {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_at?: string;
    scope?: string;
    google_account_id?: string;
    google_email?: string;
}

// Enum para estados de sincronización
export enum SyncStatus {
    ACTIVE = 'active',
    DELETED = 'deleted', 
    SYSTEM = 'system'
}

// Enum para tipos de servicio OAuth
export enum OAuthService {
    GOOGLE_REVIEWS = 'google_reviews',
    GOOGLE_CALENDAR = 'google_calendar'
}