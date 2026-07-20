import { z } from 'zod';

const optionalAuditString = z.preprocess((value) => value === null ? undefined : value, z.string().optional());

export const costModeSchema = z.enum(['IMPORTO_FISSO', 'PERCENTUALE']);

export const extraCostShape = {
  costo: z.coerce.number().nonnegative().optional(),
  costoTipo: costModeSchema.optional(),
  costoImportoFisso: z.coerce.number().nonnegative().optional(),
  costoPercentuale: z.coerce.number().min(0).max(100).optional()
};

const coverageObject = z.object({
  nome: z.string().min(1),
  ...extraCostShape,
  franchigiaRca: z.coerce.number().nonnegative().optional(),
  franchigiaRcaTipo: costModeSchema.optional(),
  franchigiaKasko: z.coerce.number().nonnegative().optional(),
  franchigiaKaskoTipo: costModeSchema.optional(),
  franchigiaFurtoIncendio: z.coerce.number().nonnegative().optional(),
  scopertoFurtoIncendio: z.coerce.number().nonnegative().optional(),
  scopertoFurtoIncendioTipo: costModeSchema.optional(),
  createdBy: z.string().optional()
});
export const createCoverageSchema = coverageObject;
export const updateCoverageSchema = coverageObject.partial().omit({ createdBy: true }).extend({ updatedBy: optionalAuditString });

const mileagePackageObject = z.object({
  nome: z.string().min(1),
  chilometraggio: z.coerce.number().int().nonnegative().nullable().optional(),
  ...extraCostShape,
  attivo: z.boolean().optional(),
  createdBy: z.string().optional()
});
export const createMileagePackageSchema = mileagePackageObject;
export const updateMileagePackageSchema = mileagePackageObject.partial().omit({ createdBy: true }).extend({ updatedBy: optionalAuditString });

const additionalServiceObject = z.object({
  nome: z.string().min(1),
  descrizione: z.string().optional(),
  ...extraCostShape,
  attivo: z.boolean().optional(),
  createdBy: z.string().optional()
});
export const createAdditionalServiceSchema = additionalServiceObject;
export const updateAdditionalServiceSchema = additionalServiceObject.partial().omit({ createdBy: true }).extend({ updatedBy: optionalAuditString });

export const upsertRentalSettingsSchema = z.object({
  costoConducenteAggiuntivo: z.coerce.number().nonnegative().optional(),
  costoConducenteAggiuntivoTipo: costModeSchema.optional(),
  costoConducenteAggiuntivoImportoFisso: z.coerce.number().nonnegative().optional(),
  costoConducenteAggiuntivoPercentuale: z.coerce.number().min(0).max(100).optional(),
  cauzioneStandard: z.coerce.number().nonnegative().optional(),
  costoKmEccedenza: z.coerce.number().nonnegative().optional(),
  penaleCarburante: z.coerce.number().nonnegative().optional(),
  createdBy: z.string().optional(),
  updatedBy: optionalAuditString
});

export const createOperatorSchema = z.object({
  nome: z.string().min(1),
  cognome: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, 'La password deve contenere almeno 8 caratteri').optional(),
  attivo: z.boolean().optional(),
  createdBy: z.string().optional()
});
export const updateOperatorSchema = createOperatorSchema.partial().omit({ createdBy: true }).extend({ updatedBy: optionalAuditString });

export const upsertCargosPortalConfigSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  apiKey: z.string().min(1),
  createdBy: z.string().optional(),
  updatedBy: optionalAuditString
});

export const updateCargosPortalConfigSchema = z.object({
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  updatedBy: optionalAuditString
});
