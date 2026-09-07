import { Model } from 'mongoose';
import { PaginationMeta, PaginatedResult, PaginationOptions } from './pagination.types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export async function paginate<T>(
  model: Model<any>,
  filter: Record<string, any>,
  options: PaginationOptions = {},
  sort: Record<string, any> = { createdAt: -1 },
  projection: any = null,
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, Number(options.page) || DEFAULT_PAGE);
  const rawPageSize = Number(options.pageSize) || options.defaultPageSize || DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize || MAX_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, rawPageSize), maxPageSize);

  const skip = (page - 1) * pageSize;

  const [totalItems, data] = await Promise.all([
    model.countDocuments(filter).exec(),
    model
      .find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec(),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize) || 0;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1 && totalPages > 0;

  const meta: PaginationMeta = {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };

  return {
    data: data as T[],
    meta,
  };
}
