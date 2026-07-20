import { z } from 'zod';

const base64BufferSchema = z.string().min(1).transform((value) => {
  const normalized = value.includes(',') ? value.split(',').pop() ?? '' : value;
  return Buffer.from(normalized, 'base64');
});

const documentTypeSchema = z.enum(['CIE_FRONT', 'CIE_BACK', 'DRIVING_LICENSE_FRONT', 'DRIVING_LICENSE_BACK', 'SIGNED_CONTRACT', 'CONTRACT_PDF', 'OTHER']);
const metadataSchema = z.record(z.unknown()).optional();

export const uploadDocumentBodySchema = z.object({
  type: documentTypeSchema,
  fileBase64: base64BufferSchema.optional(),
  fileName: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  contractDocumentId: z.string().min(1).optional(),
  metadata: metadataSchema
});

export const uploadDocumentMultipartBodySchema = z.object({
  type: documentTypeSchema,
  fileName: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  contractDocumentId: z.string().min(1).optional(),
  metadata: z.preprocess((value) => {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    try { return JSON.parse(value); } catch { return value; }
  }, metadataSchema)
});

export const saveIdentityDocumentsMultipartBodySchema = z.object({
  bookingId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  metadata: z.preprocess((value) => {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    try { return JSON.parse(value); } catch { return value; }
  }, metadataSchema)
});

export const saveIdentityDocumentsJsonSchema = z.object({
  cieFront: base64BufferSchema,
  cieBack: base64BufferSchema,
  drivingLicenseFront: base64BufferSchema,
  drivingLicenseBack: base64BufferSchema,
  bookingId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  metadata: metadataSchema
});

export const listDocumentsQuerySchema = z.object({
  type: documentTypeSchema.optional(),
  bookingId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  contractDocumentId: z.string().min(1).optional()
});
