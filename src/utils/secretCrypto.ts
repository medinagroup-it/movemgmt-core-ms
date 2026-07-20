import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function keyFromSecret(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = keyFromSecret(env.CARGOS_CONFIG_SECRET);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split(':');
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) throw new Error('Formato segreto cifrato non valido');
  const key = keyFromSecret(env.CARGOS_CONFIG_SECRET);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivBase64, 'base64'), { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedBase64, 'base64')), decipher.final()]).toString('utf8');
}

export function maskSecret(value?: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}
