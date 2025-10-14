/**
 * Pagination Utilities
 * Reusable helpers for implementing pagination across API routes
 */

import { NextRequest } from "next/server";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Extract pagination parameters from request query string
 *
 * @param req - NextRequest object
 * @param defaultLimit - Default items per page (default: 50)
 * @param maxLimit - Maximum items per page (default: 1000)
 * @returns Pagination parameters
 */
export function getPaginationParams(
  req: NextRequest,
  defaultLimit: number = 50,
  maxLimit: number = 1000
): PaginationParams {
  const { searchParams } = new URL(req.url);

  // Parse page number (default: 1, minimum: 1)
  let page = parseInt(searchParams.get("page") || "1");
  page = Math.max(1, page);

  // Parse limit (default: defaultLimit, max: maxLimit)
  let limit = parseInt(searchParams.get("limit") || String(defaultLimit));
  limit = Math.min(Math.max(1, limit), maxLimit);

  // Calculate skip
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create pagination metadata
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Create a paginated response object
 *
 * @param data - Array of data items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Apply pagination to a Mongoose query
 *
 * @example
 * const { page, limit, skip } = getPaginationParams(req);
 * const query = User.find({ isActive: true });
 * const users = await applyPagination(query, skip, limit);
 * const total = await User.countDocuments({ isActive: true });
 * return createPaginatedResponse(users, page, limit, total);
 */
export function applyPagination<T>(
  query: any,
  skip: number,
  limit: number
): Promise<T[]> {
  return query.skip(skip).limit(limit).lean();
}

/**
 * Helper to get total count with same filter as main query
 * Use this to avoid duplicate filter logic
 *
 * @param Model - Mongoose model
 * @param filter - Query filter object
 * @returns Total count
 */
export async function getTotalCount(Model: any, filter: any): Promise<number> {
  return await Model.countDocuments(filter);
}
