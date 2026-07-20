import { z } from 'zod';
import { Gender } from '@prisma/client';
import { paginationSchema } from '../utils/pagination';

export const createClientSchema = z.object({
  nome: z.string().min(1),
  cognome: z.string().min(1),
  sesso: z.nativeEnum(Gender),
  dataNascita: z.coerce.date(),
  luogoNascita: z.string().min(1),
  codiceFiscale: z.string().min(11).max(16),
  indirizzoResidenza: z.string().min(1),
  luogoRilascioCartaIdentita: z.string().min(1),
  numeroCartaIdentita: z.string().min(1),
  dataRilascioCartaIdentita: z.coerce.date().optional(),
  dataScadenzaCartaIdentita: z.coerce.date().optional(),
  luogoRilascioPatente: z.string().min(1),
  numeroPatente: z.string().min(1),
  dataRilascioPatente: z.coerce.date().optional(),
  dataScadenzaPatente: z.coerce.date().optional(),
  telefono: z.string().min(1),
  email: z.string().email().optional(),
  createdBy: z.string().optional()
});

export const updateClientSchema = createClientSchema.partial().omit({ createdBy: true }).extend({ updatedBy: z.string().optional() });

export const searchClientSchema = z.object({
  filter: z.string().optional().default(''),
  pagination: paginationSchema,
  sort: z.object({
    field: z.enum(['nome', 'cognome', 'createdAt', 'updatedAt']).default('cognome'),
    direction: z.enum(['asc', 'desc']).default('asc')
  }).default({ field: 'cognome', direction: 'asc' })
});

export const fiscalCodeSchema = z.object({
  nome: z.string().min(1),
  cognome: z.string().min(1),
  dataNascita: z.coerce.date(),
  luogoNascita: z.string().min(1),
  sesso: z.nativeEnum(Gender)
});

export const addressAutocompleteSchema = z.object({
  filter: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(10)
});
