import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../config/env';

export const storagePaths = {
  root: env.STORAGE_ROOT_PATH,
  documents: env.DOCUMENTS_STORAGE_PATH,
  temp: env.TEMP_STORAGE_PATH,
  generated: env.GENERATED_FILES_PATH
};

function assertInsideRoot(candidate: string) {
  const resolved = path.resolve(candidate);
  const root = path.resolve(storagePaths.root);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error(`Percorso storage fuori root: ${candidate}`);
  return resolved;
}

export function safeResolveStoragePath(base: string, relativePath: string): string {
  const resolved = path.resolve(base, relativePath);
  const normalizedBase = path.resolve(base);
  if (resolved !== normalizedBase && !resolved.startsWith(`${normalizedBase}${path.sep}`)) throw new Error('Path traversal rilevato');
  return resolved;
}

async function ensureWritableDirectory(directory: string) {
  const resolved = assertInsideRoot(directory);
  await fs.mkdir(resolved, { recursive: true });
  await fs.access(resolved, fs.constants.W_OK);
  return resolved;
}

export async function initializeStorage() {
  await ensureWritableDirectory(storagePaths.root);
  await Promise.all([
    ensureWritableDirectory(storagePaths.documents),
    ensureWritableDirectory(storagePaths.temp),
    ensureWritableDirectory(storagePaths.generated)
  ]);
}

export async function checkStorageReady() {
  await initializeStorage();
  const probe = path.join(storagePaths.temp, `.ready-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await fs.writeFile(probe, 'ok');
  await fs.unlink(probe);
}

export async function cleanupTempStorage() {
  await fs.mkdir(storagePaths.temp, { recursive: true });
  const entries = await fs.readdir(storagePaths.temp, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(storagePaths.temp, entry.name);
    await fs.rm(fullPath, { recursive: true, force: true });
  }));
}
