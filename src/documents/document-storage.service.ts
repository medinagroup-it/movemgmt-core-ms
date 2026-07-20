import { createHash, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { safeResolveStoragePath, storagePaths } from '../storage/storage.service';

export type DocumentType = 'CIE_FRONT' | 'CIE_BACK' | 'DRIVING_LICENSE_FRONT' | 'DRIVING_LICENSE_BACK' | 'SIGNED_CONTRACT' | 'CONTRACT_PDF' | 'OTHER';
export type BrandingRole = 'COMPANY_LOGO' | 'COMPANY_STAMP';

export type SaveDocumentInput = {
  companyId: string;
  type: DocumentType;
  buffer: Buffer;
  createdBy: string;
  originalName?: string;
  mimeType?: string;
  fileName?: string;
  bookingId?: string;
  clientId?: string;
  contractDocumentId?: string;
  metadata?: Record<string, unknown>;
};

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const imageTypes = new Set<DocumentType>(['CIE_FRONT', 'CIE_BACK', 'DRIVING_LICENSE_FRONT', 'DRIVING_LICENSE_BACK', 'OTHER']);

export function documentsStorageRoot(): string {
  return storagePaths.documents;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'application/pdf') return '.pdf';
  return '';
}

function safeFileName(value?: string): string {
  const cleaned = (value || `document-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || `document-${Date.now()}`;
}

function createStoredFileName(type: DocumentType, mimeType: string, requestedName?: string): string {
  const base = safeFileName(requestedName).replace(/\.[a-zA-Z0-9]+$/, '');
  const suffix = randomBytes(12).toString('hex');
  return `${type.toLowerCase()}-${base}-${suffix}${extensionFromMimeType(mimeType)}`;
}

function detectMimeType(buffer: Buffer, fallback?: string): string {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  return fallback || 'application/octet-stream';
}

function assertAllowedDocument(type: DocumentType, mimeType: string, sizeBytes: number): void {
  if (sizeBytes > env.MAX_UPLOAD_SIZE_MB * 1024 * 1024) throw new HttpError(413, 'File troppo grande');
  if (!allowedMimeTypes.has(mimeType)) throw new HttpError(400, `Tipo file non supportato: ${mimeType}`);
  if (imageTypes.has(type) && !mimeType.startsWith('image/')) throw new HttpError(400, `${type} deve essere un'immagine`);
  if ((type === 'SIGNED_CONTRACT' || type === 'CONTRACT_PDF') && mimeType !== 'application/pdf') throw new HttpError(400, `${type} deve essere un PDF`);
}

function toRelativePath(root: string, absolutePath: string): string {
  return path.relative(root, absolutePath).replace(/\\/g, '/');
}

function resolveStoragePath(root: string, storedPath: string): string {
  return safeResolveStoragePath(root, storedPath);
}

export async function saveDocumentAsset(input: SaveDocumentInput) {
  if (!input.buffer?.length) throw new HttpError(400, 'File documento obbligatorio');
  const mimeType = detectMimeType(input.buffer, input.mimeType);
  assertAllowedDocument(input.type, mimeType, input.buffer.length);

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const root = documentsStorageRoot();
  const dir = path.join(root, input.companyId, year, month, input.type.toLowerCase());
  await fs.mkdir(dir, { recursive: true });

  const fileName = createStoredFileName(input.type, mimeType, input.fileName || input.originalName);
  const storagePath = path.join(dir, fileName);
  await fs.writeFile(storagePath, input.buffer);

  const checksumSha256 = createHash('sha256').update(input.buffer).digest('hex');
  const relativeStoragePath = toRelativePath(root, storagePath);

  return prisma.documentAsset.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      originalName: input.originalName,
      fileName,
      mimeType,
      sizeBytes: input.buffer.length,
      storagePath: relativeStoragePath,
      checksumSha256,
      bookingId: input.bookingId,
      clientId: input.clientId,
      contractDocumentId: input.contractDocumentId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      createdBy: input.createdBy,
      updatedBy: input.createdBy
    }
  });
}

export async function listDocumentAssets(companyId: string, filter: { type?: DocumentType; bookingId?: string; clientId?: string; contractDocumentId?: string } = {}) {
  return prisma.documentAsset.findMany({
    where: { companyId, deletedAt: null, type: filter.type, bookingId: filter.bookingId, clientId: filter.clientId, contractDocumentId: filter.contractDocumentId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getDocumentAsset(companyId: string, id: string) {
  const document = await prisma.documentAsset.findFirst({ where: { companyId, id, deletedAt: null } });
  if (!document) throw new HttpError(404, 'Documento non trovato');
  return document;
}

export async function getBrandingDocument(companyId: string, role: BrandingRole) {
  return prisma.documentAsset.findFirst({
    where: { companyId, deletedAt: null, type: 'OTHER', bookingId: null, clientId: null, contractDocumentId: null, metadata: { path: ['role'], equals: role } },
    orderBy: { createdAt: 'desc' }
  });
}

export async function readDocumentAssetBuffer(document: { storagePath: string }) {
  const filePath = resolveStoragePath(documentsStorageRoot(), document.storagePath);
  return fs.readFile(filePath).catch(() => { throw new HttpError(404, 'File fisico documento non trovato'); });
}

export function documentAssetBufferToDataUrl(mimeType: string, buffer: Buffer) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export async function getDocumentAssetFile(companyId: string, id: string) {
  const document = await getDocumentAsset(companyId, id);
  const filePath = resolveStoragePath(documentsStorageRoot(), document.storagePath);
  try { await fs.access(filePath); } catch { throw new HttpError(404, 'File fisico documento non trovato'); }
  return { document, filePath };
}

export async function softDeleteDocumentAsset(companyId: string, id: string, deletedBy: string) {
  const document = await getDocumentAsset(companyId, id);
  return prisma.documentAsset.update({ where: { id: document.id }, data: { deletedAt: new Date(), deletedBy, updatedBy: deletedBy } });
}

export function toDocumentAssetDto(document: any) {
  return {
    id: document.id,
    type: document.type,
    originalName: document.originalName,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    storageProvider: document.storageProvider,
    checksumSha256: document.checksumSha256,
    bookingId: document.bookingId,
    clientId: document.clientId,
    contractDocumentId: document.contractDocumentId,
    metadata: document.metadata,
    createdAt: document.createdAt,
    createdBy: document.createdBy,
    updatedAt: document.updatedAt,
    updatedBy: document.updatedBy,
    deletedAt: document.deletedAt,
    deletedBy: document.deletedBy
  };
}
