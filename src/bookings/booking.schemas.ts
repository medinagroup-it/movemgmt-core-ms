import { z } from 'zod';
import { BookingStatus, DamageStatus, PaymentMethod } from '@prisma/client';
import { paginationSchema } from '../utils/pagination';
import { createClientSchema } from '../clients/client.schemas';
import { createBillingDataSchema } from '../billing-data/billing-data.schemas';

const depositPaymentMethodSchema = z.enum(['CONTANTI', 'CARTA', 'BONIFICO']);

const baseBookingObject = z.object({
  clienteId: z.string().uuid().optional(),
  nuovoCliente: createClientSchema.omit({ createdBy: true }).optional(),
  conducenteAggiuntivoId: z.string().uuid().optional(),
  nuovoConducenteAggiuntivo: createClientSchema.omit({ createdBy: true }).optional(),
  billingDataId: z.string().uuid().optional(),
  nuoviDatiFatturazione: createBillingDataSchema.omit({ createdBy: true, clienteId: true }).optional(),
  veicoloId: z.string().uuid(),
  dataPrenotazione: z.coerce.date().optional(),
  dataEmissioneFattura: z.coerce.date().optional(),
  dataInizioContratto: z.coerce.date(),
  dataFineContratto: z.coerce.date(),
  prezzo: z.coerce.number().nonnegative(),
  metodoPagamento: z.nativeEnum(PaymentMethod).optional(),
  mileagePackageId: z.string().uuid(),
  nomeOperatore: z.string().min(1),
  operatorId: z.string().uuid().optional(),
  coperturaAssicurativa: z.string().optional(),
  coperturaAssicurativaId: z.string().uuid().optional(),
  serviziAggiuntiviIds: z.array(z.string().uuid()).optional().default([]),
  kmInizio: z.coerce.number().int().nonnegative().optional(),
  note: z.string().optional(),
  createdBy: z.string().optional()
});

function bookingRefinements(v: any, ctx: z.RefinementCtx) {
  if (!v.clienteId && !v.nuovoCliente) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Specificare clienteId oppure nuovoCliente' });
  if (v.clienteId && v.nuovoCliente) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Specificare solo uno tra clienteId e nuovoCliente' });
  if (v.conducenteAggiuntivoId && v.nuovoConducenteAggiuntivo) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Specificare solo uno tra conducenteAggiuntivoId e nuovoConducenteAggiuntivo' });
  if (v.billingDataId && v.nuoviDatiFatturazione) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Specificare solo uno tra billingDataId e nuoviDatiFatturazione' });
}

export const createBookingSchema = baseBookingObject.extend({ stato: z.literal(BookingStatus.CONFERMATA).optional() }).superRefine(bookingRefinements);
export const createDraftBookingSchema = baseBookingObject.extend({ stato: z.literal(BookingStatus.BOZZA).optional() }).superRefine(bookingRefinements);
export const updateBookingSchema = baseBookingObject.partial().omit({ createdBy: true, nuovoCliente: true, nuovoConducenteAggiuntivo: true, nuoviDatiFatturazione: true }).extend({ updatedBy: z.string().optional() });
export const cancelBookingSchema = z.object({ updatedBy: z.string().optional(), note: z.string().optional() });
export const findByFineSchema = z.object({ targa: z.string().min(1), dataMulta: z.coerce.date() });
export const searchBookingSchema = z.object({
  filter: z.object({ clienteId: z.string().uuid().optional(), veicoloId: z.string().uuid().optional(), targa: z.string().optional(), nomeCliente: z.string().optional(), cognomeCliente: z.string().optional(), codiceFiscale: z.string().optional(), stato: z.nativeEnum(BookingStatus).optional(), metodoPagamento: z.nativeEnum(PaymentMethod).optional(), nomeOperatore: z.string().optional(), dataInizioContrattoDa: z.coerce.date().optional(), dataInizioContrattoA: z.coerce.date().optional(), dataFineContrattoDa: z.coerce.date().optional(), dataFineContrattoA: z.coerce.date().optional(), dataEmissioneFatturaDa: z.coerce.date().optional(), dataEmissioneFatturaA: z.coerce.date().optional() }).default({}),
  pagination: paginationSchema,
  sort: z.object({ field: z.enum(['dataPrenotazione', 'dataInizioContratto', 'dataFineContratto', 'createdAt', 'updatedAt']).default('dataInizioContratto'), direction: z.enum(['asc', 'desc']).default('desc') }).default({ field: 'dataInizioContratto', direction: 'desc' })
});

export const bookingDeliverySchema = z.object({
  importoCauzione: z.coerce.number().nonnegative(),
  metodoPagamentoCauzione: depositPaymentMethodSchema,
  codicePreautorizzazioneCauzione: z.string().optional(),
  livelloCarburanteConsegna: z.coerce.number().int().min(0).max(100),
  kmConsegna: z.coerce.number().int().nonnegative(),
  updatedBy: z.string().optional()
}).superRefine((v, ctx) => {
  if (v.metodoPagamentoCauzione !== 'CARTA' && v.codicePreautorizzazioneCauzione) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il codice preautorizzazione e consentito solo per cauzione pagata con carta', path: ['codicePreautorizzazioneCauzione'] });
  }
});

export const bookingReturnDamageSchema = z.object({
  note: z.string().optional(),
  x: z.coerce.number().int().nonnegative(),
  y: z.coerce.number().int().nonnegative(),
  stato: z.nativeEnum(DamageStatus).optional().default(DamageStatus.APERTO)
});

export const bookingReturnSchema = z.object({
  livelloCarburanteRiconsegna: z.coerce.number().int().min(0).max(100),
  kmRiconsegna: z.coerce.number().int().nonnegative(),
  cauzioneRestituita: z.coerce.boolean().optional(),
  cauzioneTrattenuta: z.coerce.boolean().optional(),
  metodoPagamentoCauzione: depositPaymentMethodSchema.optional(),
  codicePreautorizzazioneCauzione: z.string().optional(),
  noteRiconsegna: z.string().optional(),
  importoPenali: z.coerce.number().nonnegative().optional(),
  metodoPagamentoPenali: z.nativeEnum(PaymentMethod).optional(),
  nuoviDanni: z.array(bookingReturnDamageSchema).optional().default([]),
  updatedBy: z.string().optional()
}).superRefine((v, ctx) => {
  if (v.cauzioneRestituita && v.cauzioneTrattenuta) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La cauzione non puo essere sia restituita sia trattenuta' });
  if (v.metodoPagamentoCauzione && v.metodoPagamentoCauzione !== 'CARTA' && v.codicePreautorizzazioneCauzione) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il codice preautorizzazione e consentito solo per cauzione pagata con carta', path: ['codicePreautorizzazioneCauzione'] });
  }
});
