/**
 * Pagination utilities for list endpoints.
 * Supports skip/limit and cursor-based pagination for Prisma model delegates.
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextCursor?: string;
  };
}

/**
 * Build a filter object from query params, stripping undefined/null/empty values.
 */
export function buildFilter(params: Record<string, any>): Record<string, any> {
  const filter: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        filter[key] = { ...value };
      } else {
        filter[key] = value;
      }
    }
  }
  return filter;
}

/**
 * Build sort object for Prisma orderBy.
 */
export function buildSort(sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc'): Record<string, 'asc' | 'desc'> {
  return {
    [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * Execute paginated query using Prisma Model Delegate.
 */
export async function paginate<T>(
  modelDelegate: { findMany: (args: any) => Promise<T[]>; count: (args: any) => Promise<number> },
  where: Record<string, any>,
  options: PaginationOptions,
  include?: Record<string, any>
): Promise<PaginatedResult<T>> {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 10;
  const skip = (page - 1) * limit;

  const orderBy = buildSort(options.sortBy, options.sortOrder);

  const queryArgs: any = {
    where,
    orderBy,
    skip,
    take: limit,
  };

  if (include) {
    queryArgs.include = include;
  }

  const [data, total] = await Promise.all([
    modelDelegate.findMany(queryArgs),
    modelDelegate.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  let nextCursor: string | undefined;
  if (hasNextPage && data.length > 0) {
    nextCursor = (data[data.length - 1] as any).id;
  }

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextCursor,
    },
  };
}
