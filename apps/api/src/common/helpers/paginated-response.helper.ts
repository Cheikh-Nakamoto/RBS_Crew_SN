import { ApiResponse } from '@rbs/types';
import { PaginationQueryDto } from '../dto/pagination.dto';

export function paginate<T>(
  data: T[],
  total: number,
  query: PaginationQueryDto,
): ApiResponse<T[]> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
