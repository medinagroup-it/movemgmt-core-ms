import { z } from 'zod';
import { paginationSchema } from '../utils/pagination';

export const createFineSchema = z.object({
  targa: z.string().min(1),
  dataMulta: z.coerce.date(),
  importo: z.coerce.number().nonnegative(),
  dataNotifica: z.coerce.date(),
  luogoInfrazione: z.string().min(1),
  dataRinotifica: z.coerce.date().optional(),
  note: z.string().optional(),
  createdBy: z.string().optional()
});
export const updateFineSchema = z.object({
  importo: z.coerce.number().nonnegative().optional(),
  dataNotifica: z.coerce.date().optional(),
  luogoInfrazione: z.string().min(1).optional(),
  dataRinotifica: z.preprocess((value) => value === null || value === '' ? null : value, z.coerce.date().nullable().optional()),
  note: z.string().optional(),
  updatedBy: z.string().optional()
});
export const searchFineSchema = z.object({
  filter: z.object({
    targa: z.string().optional(),
    bookingId: z.string().uuid().optional(),
    veicoloId: z.string().uuid().optional(),
    dataMultaDa: z.coerce.date().optional(),
    dataMultaA: z.coerce.date().optional()
  }).default({}),
  pagination: paginationSchema
});
