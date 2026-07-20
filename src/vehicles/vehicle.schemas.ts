import { z } from 'zod';
import { FuelType, VehicleStatus, VehicleType } from '@prisma/client';
import { paginationSchema } from '../utils/pagination';

const costModeSchema = z.enum(['IMPORTO_FISSO', 'PERCENTUALE']);
const purchaseMethodSchema = z.enum(['LEASING', 'NOLEGGIO', 'ACQUISTO']);

const optionalNumber = z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, z.coerce.number().nonnegative().optional());
const optionalPositiveNumber = z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, z.coerce.number().positive().optional());
const optionalInteger = z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, z.coerce.number().int().nonnegative().optional());
const optionalDate = z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, z.coerce.date().optional());
const optionalString = z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, z.string().optional());
const optionalCostMode = z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, costModeSchema.optional());
const optionalPurchaseMethod = z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : value, purchaseMethodSchema.optional());

export const createVehicleSchema = z.object({
  tipo: z.nativeEnum(VehicleType),
  marca: z.string().min(1),
  modello: z.string().min(1),
  targa: z.string().min(1),
  dataImmatricolazione: z.coerce.date(),
  alimentazione: z.nativeEnum(FuelType),
  costoGiornaliero: z.coerce.number().nonnegative(),
  lunghezza: optionalPositiveNumber,
  larghezza: optionalPositiveNumber,
  altezza: optionalPositiveNumber,
  lunghezzaInterna: optionalPositiveNumber,
  larghezzaInterna: optionalPositiveNumber,
  altezzaInterna: optionalPositiveNumber,
  postiAuto: optionalInteger,
  metodoAcquisto: optionalPurchaseMethod,
  canoneMensile: optionalNumber,
  importoVeicolo: optionalNumber,
  franchigiaRca: optionalNumber,
  franchigiaRcaTipo: optionalCostMode,
  franchigiaKasko: optionalNumber,
  franchigiaKaskoTipo: optionalCostMode,
  scopertoFurtoIncendio: optionalNumber,
  scopertoFurtoIncendioTipo: optionalCostMode,
  compagniaAssicurativa: optionalString,
  dataScadenzaAssicurazione: optionalDate,
  importoAssicurazione: optionalNumber,
  stato: z.nativeEnum(VehicleStatus).optional(),
  kmAttuali: optionalInteger,
  createdBy: optionalString
});

export const updateVehicleSchema = createVehicleSchema.partial().omit({ createdBy: true }).extend({ updatedBy: optionalString });

export const availabilitySchema = z.object({
  targa: z.string().min(1),
  dataInizioContratto: z.coerce.date(),
  dataFineContratto: z.coerce.date()
});

export const quoteSchema = availabilitySchema;

export const availableVehiclesSchema = z.object({
  tipo: z.nativeEnum(VehicleType),
  dataInizioContratto: z.coerce.date(),
  dataFineContratto: z.coerce.date()
});

export const searchVehicleSchema = z.object({
  filter: z.string().optional().default(''),
  pagination: paginationSchema,
  sort: z.object({
    field: z.enum(['marca', 'modello', 'targa', 'createdAt', 'updatedAt']).default('targa'),
    direction: z.enum(['asc', 'desc']).default('asc')
  }).default({ field: 'targa', direction: 'asc' })
});
