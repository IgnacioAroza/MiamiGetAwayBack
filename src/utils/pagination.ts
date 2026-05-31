export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export function parsePagination(query: Record<string, any>): PaginationParams | null {
    if (!query.page && !query.limit) return null;
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(query.limit as string) || 20));
    return { page, limit, offset: (page - 1) * limit };
}

export function paginatedResponse<T>(rows: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
    return {
        data: rows,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages: Math.ceil(total / params.limit),
        },
    };
}
