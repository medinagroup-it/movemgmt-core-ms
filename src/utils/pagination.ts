import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
}).default({ page: 1, pageSize: 20 });

export function toPagination(page = 1, pageSize = 20) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
