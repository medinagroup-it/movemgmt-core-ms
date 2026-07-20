import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AccountStatus } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { HttpError, ErrorCodes } from '../utils/httpError';
import { loginSchema, registerSchema } from './auth.schemas';

type TokenAccount = { id: string; companyId: string; email: string; ruolo?: string };

function tokenFor(account: TokenAccount) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  };
  return jwt.sign({ sub: account.id, userId: account.id, companyId: account.companyId, email: account.email, ruolo: account.ruolo ?? 'USER' }, env.JWT_SECRET, options);
}

function defaultExpiry() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function toAuthDto(account: any) {
  return {
    accessToken: tokenFor(account),
    tokenType: 'Bearer',
    expiresIn: env.JWT_EXPIRES_IN,
    account: {
      id: account.id,
      email: account.email,
      stato: account.stato,
      dataScadenza: account.dataScadenza?.toISOString?.() ?? account.dataScadenza,
      companyId: account.companyId,
      ruolo: 'USER',
      societa: account.company ? {
        id: account.company.id,
        nomeSocieta: account.company.nomeSocieta,
        ragioneSociale: account.company.ragioneSociale,
        partitaIva: account.company.partitaIva,
        codiceFiscale: account.company.codiceFiscale,
        indirizzoSedeLegale: account.company.indirizzoSedeLegale,
        codiceUnivoco: account.company.codiceUnivoco,
        email: account.company.email
      } : undefined
    }
  };
}

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.account.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, 'Email già registrata', undefined, ErrorCodes.RESOURCE_CONFLICT);
  const passwordHash = await bcrypt.hash(input.password, env.PASSWORD_HASH_ROUNDS);
  const account = await prisma.$transaction(async (tx: any) => {
    const company = await tx.company.create({
      data: {
        nomeSocieta: input.nomeSocieta,
        ragioneSociale: input.datiFatturazione.ragioneSociale,
        partitaIva: input.datiFatturazione.partitaIva,
        codiceFiscale: input.datiFatturazione.codiceFiscaleSocieta,
        indirizzoSedeLegale: input.datiFatturazione.indirizzoSedeLegale,
        codiceUnivoco: input.datiFatturazione.codiceUnivoco,
        email: input.email
      }
    });
    return tx.account.create({
      data: { companyId: company.id, email: input.email, passwordHash, stato: AccountStatus.ATTIVO, dataScadenza: defaultExpiry() },
      include: { company: true }
    });
  });
  return toAuthDto(account);
}

export async function login(input: z.infer<typeof loginSchema>) {
  const invalidMessage = 'Credenziali non valide';
  const account = await prisma.account.findUnique({ where: { email: input.email }, include: { company: true } });
  if (!account) throw new HttpError(401, invalidMessage, undefined, ErrorCodes.UNAUTHORIZED);
  const ok = await bcrypt.compare(input.password, account.passwordHash);
  if (!ok) throw new HttpError(401, invalidMessage, undefined, ErrorCodes.UNAUTHORIZED);
  if (account.stato !== AccountStatus.ATTIVO || account.dataScadenza < new Date()) throw new HttpError(401, 'Account non attivo', undefined, ErrorCodes.UNAUTHORIZED);
  return toAuthDto(account);
}
