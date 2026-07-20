import { z } from 'zod';
import { DamageStatus } from '@prisma/client';
import { paginationSchema } from '../utils/pagination';

export const createDamageSchema = z.object({
  note: z.string().optional(),
  x: z.coerce.number().int().nonnegative(),
  y: z.coerce.number().int().nonnegative(),
  dataAggiunta: z.coerce.date().optional(),
  createdBy: z.string().optional()
});

export const updateDamageSchema = z.object({
  note: z.string().optional(),
  x: z.coerce.number().int().nonnegative().optional(),
  y: z.coerce.number().int().nonnegative().optional(),
  updatedBy: z.string().optional(),
  stato: z.nativeEnum(DamageStatus).optional()
});

export const searchDamageSchema = z.object({
  filter: z.object({
    veicoloId: z.string().uuid().optional(),
    targa: z.string().optional(),
    stato: z.nativeEnum(DamageStatus).optional(),
    note: z.string().optional(),
    dataAggiuntaDa: z.coerce.date().optional(),
    dataAggiuntaA: z.coerce.date().optional()
  }).default({}),
  pagination: paginationSchema,
  sort: z.object({
    field: z.enum(['dataAggiunta', 'dataRiparazione', 'createdAt', 'updatedAt']).default('dataAggiunta'),
    direction: z.enum(['asc', 'desc']).default('desc')
  }).default({ field: 'dataAggiunta', direction: 'desc' })
});
