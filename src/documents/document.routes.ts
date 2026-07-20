import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { actorFrom, updaterFrom } from '../utils/audit';
import { companyIdFrom } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { routeParam } from '../utils/params';
import { listDocumentsQuerySchema, saveIdentityDocumentsJsonSchema, saveIdentityDocumentsMultipartBodySchema, uploadDocumentBodySchema, uploadDocumentMultipartBodySchema } from './document.schemas';
import { HttpError } from '../utils/httpError';
import * as storage from './document-storage.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024, files: 4 } });
const sides = ['cieFront', 'cieBack', 'drivingLicenseFront', 'drivingLicenseBack'] as const;
type DocumentSide = typeof sides[number];
const sideToType: Record<DocumentSide, storage.DocumentType> = {
  cieFront: 'CIE_FRONT',
  cieBack: 'CIE_BACK',
  drivingLicenseFront: 'DRIVING_LICENSE_FRONT',
  drivingLicenseBack: 'DRIVING_LICENSE_BACK'
};

export const documentRouter = Router();

documentRouter.get('/', asyncHandler(async (req, res) => {
  const query = listDocumentsQuerySchema.parse(req.query);
  const documents = await storage.listDocumentAssets(companyIdFrom(req), query);
  res.json(documents.map(storage.toDocumentAssetDto));
}));

documentRouter.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  const contentType = req.headers['content-type'] ?? '';
  const companyId = companyIdFrom(req);
  const createdBy = actorFrom(req);

  if (contentType.includes('multipart/form-data')) {
    const parsed = uploadDocumentMultipartBodySchema.parse(req.body);
    if (!req.file) throw new HttpError(400, 'File documento obbligatorio nel campo multipart file');
    const document = await storage.saveDocumentAsset({ companyId, type: parsed.type, buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, fileName: parsed.fileName, bookingId: parsed.bookingId, clientId: parsed.clientId, contractDocumentId: parsed.contractDocumentId, metadata: parsed.metadata, createdBy });
    res.status(201).json(storage.toDocumentAssetDto(document));
    return;
  }

  const parsed = uploadDocumentBodySchema.parse(req.body);
  if (!parsed.fileBase64) throw new HttpError(400, 'fileBase64 obbligatorio');
  const document = await storage.saveDocumentAsset({ companyId, type: parsed.type, buffer: parsed.fileBase64, originalName: parsed.fileName, fileName: parsed.fileName, mimeType: parsed.mimeType, bookingId: parsed.bookingId, clientId: parsed.clientId, contractDocumentId: parsed.contractDocumentId, metadata: parsed.metadata, createdBy });
  res.status(201).json(storage.toDocumentAssetDto(document));
}));

documentRouter.post('/identity-files', upload.fields(sides.map((name) => ({ name, maxCount: 1 }))), asyncHandler(async (req, res) => {
  const contentType = req.headers['content-type'] ?? '';
  const companyId = companyIdFrom(req);
  const createdBy = actorFrom(req);
  let images: Record<DocumentSide, Buffer>;
  let bookingId: string | undefined;
  let clientId: string | undefined;
  let metadata: Record<string, unknown> | undefined;
  const originalNames: Partial<Record<DocumentSide, string>> = {};
  const mimeTypes: Partial<Record<DocumentSide, string>> = {};

  if (contentType.includes('multipart/form-data')) {
    const parsed = saveIdentityDocumentsMultipartBodySchema.parse(req.body);
    bookingId = parsed.bookingId;
    clientId = parsed.clientId;
    metadata = parsed.metadata;
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    images = sides.reduce((acc, side) => {
      const file = files?.[side]?.[0];
      if (!file) throw new HttpError(400, `MISSING_IMAGE: ${side}`);
      acc[side] = file.buffer;
      originalNames[side] = file.originalname;
      mimeTypes[side] = file.mimetype;
      return acc;
    }, {} as Record<DocumentSide, Buffer>);
  } else {
    const parsed = saveIdentityDocumentsJsonSchema.parse(req.body);
    images = { cieFront: parsed.cieFront, cieBack: parsed.cieBack, drivingLicenseFront: parsed.drivingLicenseFront, drivingLicenseBack: parsed.drivingLicenseBack };
    bookingId = parsed.bookingId;
    clientId = parsed.clientId;
    metadata = parsed.metadata;
  }

  const documents = await Promise.all(sides.map((side) => storage.saveDocumentAsset({ companyId, type: sideToType[side], buffer: images[side], originalName: originalNames[side], mimeType: mimeTypes[side], bookingId, clientId, metadata: { ...(metadata ?? {}), identitySide: side }, createdBy })));
  res.status(201).json({ documents: documents.map(storage.toDocumentAssetDto) });
}));

documentRouter.get('/:id', asyncHandler(async (req, res) => {
  const document = await storage.getDocumentAsset(companyIdFrom(req), routeParam(req.params.id, 'id'));
  res.json(storage.toDocumentAssetDto(document));
}));

documentRouter.get('/:id/download', asyncHandler(async (req, res) => {
  const { document, filePath } = await storage.getDocumentAssetFile(companyIdFrom(req), routeParam(req.params.id, 'id'));
  res.setHeader('Content-Type', document.mimeType);
  res.download(filePath, document.originalName || document.fileName);
}));

documentRouter.delete('/:id', asyncHandler(async (req, res) => {
  const document = await storage.softDeleteDocumentAsset(companyIdFrom(req), routeParam(req.params.id, 'id'), updaterFrom(req));
  res.json(storage.toDocumentAssetDto(document));
}));
