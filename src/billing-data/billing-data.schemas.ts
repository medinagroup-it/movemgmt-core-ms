import { z } from 'zod';
import { paginationSchema } from '../utils/pagination';

export const createBillingDataSchema = z.object({
  clienteId: z.string().uuid(),
  partitaIva: z.string().optional(),
  codiceFiscale: z.string().min(5),
  ragioneSociale: z.string().min(1),
  indirizzoSedeLegale: z.string().min(1),
  codiceUnivoco: z.string().optional(),
  pec: z.string().optional(),
  email: z.string().email().optional(),
  createdBy: z.string().optional()
});
export const updateBillingDataSchema = createBillingDataSchema.partial().omit({ createdBy: true }).extend({ updatedBy: z.string().optional() });
export const searchBillingDataSchema = z.object({
  clienteId: z.string().uuid().optional(),
  filter: z.string().optional().default(''),
  pagination: paginationSchema
});
