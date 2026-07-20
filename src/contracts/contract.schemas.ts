import { z } from 'zod';

const pdfOptionsSchema = z.record(z.unknown()).optional();
const metadataSchema = z.record(z.unknown()).optional();
const bookingIdSchema = z.string().uuid().or(z.string().min(1));
const signatureValueSchema = z.union([
  z.string().min(1),
  z.object({
    dataUrl: z.string().min(1).optional(),
    base64: z.string().min(1).optional(),
    url: z.string().url().optional(),
    mimeType: z.string().optional(),
    alt: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    className: z.string().optional(),
    style: z.string().optional()
  })
]);
const signatureSchema = signatureValueSchema.optional();

const signAreaSchema = z.object({
  client: z.object({
    text: z.string().min(1).optional(),
    className: z.string().min(1).optional(),
    style: z.string().min(1).optional()
  }).optional()
}).optional();

export const createContractTemplateSchema = z.object({
  name: z.string().min(1),
  html: z.string().min(1),
  isDefault: z.boolean().optional().default(false)
});

export const updateContractTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  html: z.string().min(1).optional()
}).refine((value) => value.name !== undefined || value.html !== undefined, { message: 'Almeno un campo deve essere valorizzato' });

export const setDefaultContractTemplateSchema = z.object({
  code: z.string().min(1)
});

export const generateContractSchema = z.object({
  bookingId: bookingIdSchema.optional(),
  templateCode: z.string().min(1).optional(),
  placeholder: z.record(z.unknown()).default({}),
  signature: z.object({ client: signatureSchema }).optional(),
  pdf: pdfOptionsSchema
});

export const renderContractHtmlSchema = z.object({
  bookingId: bookingIdSchema.optional(),
  templateCode: z.string().min(1).optional(),
  placeholder: z.record(z.unknown()).default({}),
  signArea: signAreaSchema
});

export const signContractSchema = z.object({
  bookingId: bookingIdSchema.optional(),
  templateCode: z.string().min(1).optional(),
  placeholder: z.record(z.unknown()).default({}),
  signature: z.object({ client: signatureValueSchema }),
  pdf: pdfOptionsSchema
});

export const saveSignedContractDocumentSchema = z.object({
  bookingId: bookingIdSchema,
  templateCode: z.string().min(1).optional(),
  placeholder: z.record(z.unknown()).default({}),
  signature: z.object({ client: signatureValueSchema }),
  pdf: pdfOptionsSchema,
  fileName: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  metadata: metadataSchema
});
