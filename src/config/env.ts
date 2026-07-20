import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');
const currentNodeEnv = nodeEnvSchema.parse(process.env.NODE_ENV ?? 'development');

function optionalDefault(value: string | undefined, fallback: string): string | undefined {
  return value ?? (currentNodeEnv === 'production' ? undefined : fallback);
}

function csv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function readEnvFileValue(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (!filePath) return undefined;
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    throw new Error(`Impossibile leggere ${name}_FILE: ${filePath}`);
  }
}

function envValue(name: string): string | undefined {
  const directValue = process.env[name];
  const fileValue = readEnvFileValue(name);
  if (directValue && fileValue) {
    throw new Error(`Configurazione ambiente non valida: usare ${name} oppure ${name}_FILE, non entrambi`);
  }
  return directValue ?? fileValue;
}

const rawEnv = {
  ...process.env,
  NODE_ENV: currentNodeEnv,
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL: envValue('DATABASE_URL'),
  JWT_SECRET: envValue('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '8h',
  JWT_ISSUER: optionalDefault(process.env.JWT_ISSUER, 'movemgmt-core-ms'),
  JWT_AUDIENCE: optionalDefault(process.env.JWT_AUDIENCE, 'movemgmt-fe'),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? (currentNodeEnv === 'production' ? 'https://moveon.medinagroup.it' : 'http://localhost:5173,http://localhost:3000,http://localhost:4173'),
  STORAGE_ROOT_PATH: process.env.STORAGE_ROOT_PATH ?? (currentNodeEnv === 'production' ? '/app/storage' : path.resolve(process.cwd(), 'storage')),
  MAX_UPLOAD_SIZE_MB: process.env.MAX_UPLOAD_SIZE_MB ?? '12',
  LOG_LEVEL: process.env.LOG_LEVEL ?? (currentNodeEnv === 'test' ? 'silent' : currentNodeEnv === 'production' ? 'info' : 'debug'),
  REQUEST_TIMEOUT_MS: process.env.REQUEST_TIMEOUT_MS ?? '30000',
  SHUTDOWN_TIMEOUT_MS: process.env.SHUTDOWN_TIMEOUT_MS ?? '10000',
  TRUST_PROXY: process.env.TRUST_PROXY ?? (currentNodeEnv === 'production' ? '1' : 'false'),
  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED ?? (currentNodeEnv === 'production' ? 'false' : 'true'),
  PASSWORD_HASH_ROUNDS: process.env.PASSWORD_HASH_ROUNDS ?? '12',
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ?? '60000',
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS ?? '300',
  LOGIN_RATE_LIMIT_MAX_REQUESTS: process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS ?? '10',
  CARGOS_CONFIG_SECRET: envValue('CARGOS_CONFIG_SECRET') ?? optionalDefault(undefined, 'dev-cargos-secret-change-me-32-chars'),
  CONTRACT_CLIENT_SIGNATURE_PLACEHOLDER: process.env.CONTRACT_CLIENT_SIGNATURE_PLACEHOLDER ?? '[[FIRMA_CLIENTE]]',
  CONTRACT_DEFAULT_SIGNATURE_WIDTH: process.env.CONTRACT_DEFAULT_SIGNATURE_WIDTH ?? '180px',
  CONTRACT_DEFAULT_SIGNATURE_HEIGHT: process.env.CONTRACT_DEFAULT_SIGNATURE_HEIGHT ?? '70px'
};

const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL obbligatoria'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve contenere almeno 32 caratteri'),
  JWT_EXPIRES_IN: z.string().min(1),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  CORS_ORIGIN: z.string().min(1).transform(csv),
  STORAGE_ROOT_PATH: z.string().min(1),
  DOCUMENTS_STORAGE_PATH: z.string().optional(),
  TEMP_STORAGE_PATH: z.string().optional(),
  GENERATED_FILES_PATH: z.string().optional(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive(),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive(),
  TRUST_PROXY: z.union([z.literal('true'), z.literal('false'), z.coerce.number().int().nonnegative()]).transform((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }),
  SWAGGER_ENABLED: z.coerce.boolean(),
  PASSWORD_HASH_ROUNDS: z.coerce.number().int().min(10).max(15),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive(),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive(),
  LOGIN_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive(),
  CARGOS_CONFIG_SECRET: z.string().min(32),
  CONTRACT_CLIENT_SIGNATURE_PLACEHOLDER: z.string().min(1),
  CONTRACT_DEFAULT_SIGNATURE_WIDTH: z.string().min(1),
  CONTRACT_DEFAULT_SIGNATURE_HEIGHT: z.string().min(1)
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production') {
    if (value.CORS_ORIGIN.length !== 1 || value.CORS_ORIGIN[0] !== 'https://moveon.medinagroup.it') {
      ctx.addIssue({ code: 'custom', message: 'In production CORS_ORIGIN deve essere https://moveon.medinagroup.it', path: ['CORS_ORIGIN'] });
    }
    if (value.JWT_SECRET.includes('dev') || value.CARGOS_CONFIG_SECRET.includes('dev')) {
      ctx.addIssue({ code: 'custom', message: 'I secret di production non possono usare valori development', path: ['JWT_SECRET'] });
    }
  }
});

function absolutePath(input: string, base?: string): string {
  return path.resolve(base ?? process.cwd(), input);
}

const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Configurazione ambiente non valida: ${details}`);
}

const root = absolutePath(parsed.data.STORAGE_ROOT_PATH);

export const env = {
  ...parsed.data,
  STORAGE_ROOT_PATH: root,
  DOCUMENTS_STORAGE_PATH: absolutePath(parsed.data.DOCUMENTS_STORAGE_PATH ?? 'documents', root),
  TEMP_STORAGE_PATH: absolutePath(parsed.data.TEMP_STORAGE_PATH ?? 'tmp', root),
  GENERATED_FILES_PATH: absolutePath(parsed.data.GENERATED_FILES_PATH ?? 'generated', root),
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  isProduction: parsed.data.NODE_ENV === 'production'
};
