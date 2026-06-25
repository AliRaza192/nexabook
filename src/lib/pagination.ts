export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function getPaginationParams(searchParams: Record<string, string | string[] | undefined>, defaultPageSize = 25): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.pageSize as string) || defaultPageSize));
  return { page, pageSize };
}

export function buildPaginationResult(total: number, params: PaginationParams): PaginationResult {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

export function getOffset(params: PaginationParams): number {
  return (params.page - 1) * params.pageSize;
}
