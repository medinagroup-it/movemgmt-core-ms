import bcrypt from 'bcryptjs';
import { AccountStatus, BookingStatus, FuelType, VehicleStatus, VehicleType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { ITALIAN_CITIES_BY_PROVINCE } from '../config/cities';
import { createAdditionalServiceSchema, createCoverageSchema, createMileagePackageSchema, createOperatorSchema, updateAdditionalServiceSchema, updateCoverageSchema, updateMileagePackageSchema, upsertRentalSettingsSchema, upsertCargosPortalConfigSchema, updateCargosPortalConfigSchema, updateOperatorSchema } from './setup.schemas';
import { HttpError } from '../utils/httpError';
import { decryptSecret, encryptSecret } from '../utils/secretCrypto';
import { getBrandingDocument } from '../documents/document-storage.service';

type CreateCoverage = z.infer<typeof createCoverageSchema> & { createdBy: string };
type CreateOperator = z.infer<typeof createOperatorSchema> & { createdBy: string };
type UpdateOperator = z.infer<typeof updateOperatorSchema> & { updatedBy: string };
type CostInput = { costo?: number; costoTipo?: 'IMPORTO_FISSO' | 'PERCENTUALE'; costoImportoFisso?: number; costoPercentuale?: number };

function normalizeCost(data: CostInput) {
  const costo = data.costo ?? data.costoImportoFisso ?? data.costoPercentuale;
  const costoTipo = data.costoTipo ?? ((data.costoPercentuale ?? 0) > 0 ? 'PERCENTUALE' : 'IMPORTO_FISSO');
  return {
    costo,
    costoTipo,
    costoImportoFisso: costoTipo === 'IMPORTO_FISSO' ? costo ?? 0 : 0,
    costoPercentuale: costoTipo === 'PERCENTUALE' ? costo ?? 0 : 0
  };
}

function defaultExpiry() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

async function ensureOperatorAccount(tx: any, companyId: string, currentAccountId: string | null | undefined, email: string | undefined, password: string | undefined, active: boolean | undefined) {
  if (!email && !password) return currentAccountId ?? undefined;
  if (!email) throw new HttpError(400, 'Email obbligatoria per creare o aggiornare credenziali operatore');

  const status = active === false ? AccountStatus.DISATTIVO : AccountStatus.ATTIVO;
  if (currentAccountId) {
    const update: any = { email, stato: status };
    if (password) update.passwordHash = await bcrypt.hash(password, 12);
    await tx.account.update({ where: { id: currentAccountId }, data: update });
    return currentAccountId;
  }

  if (!password) throw new HttpError(400, 'Password obbligatoria per creare credenziali operatore');
  const existing = await tx.account.findUnique({ where: { email } });
  if (existing && existing.companyId !== companyId) throw new HttpError(409, 'Email gia registrata su altra societa');
  if (existing && existing.companyId === companyId) return existing.id;
  const account = await tx.account.create({ data: { companyId, email, passwordHash: await bcrypt.hash(password, 12), stato: status, dataScadenza: defaultExpiry() } });
  return account.id;
}

export async function createCoverage(companyId: string, data: CreateCoverage) {
  const costs = normalizeCost(data);
  return prisma.insuranceCoverage.create({ data: { ...data, ...costs, franchigiaFurtoIncendio: data.scopertoFurtoIncendio ?? data.franchigiaFurtoIncendio, companyId } });
}
export async function listCoverages(companyId: string) { return prisma.insuranceCoverage.findMany({ where: { companyId, deletedAt: null }, orderBy: { nome: 'asc' } }); }
export async function updateCoverage(companyId: string, id: string, data: z.infer<typeof updateCoverageSchema> & { updatedBy: string }) {
  const item = await prisma.insuranceCoverage.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!item) throw new HttpError(404, 'Copertura non trovata');
  const costs = data.costo !== undefined || data.costoTipo !== undefined || data.costoImportoFisso !== undefined || data.costoPercentuale !== undefined ? normalizeCost({ costo: data.costo ?? Number(item.costo ?? 0), costoTipo: data.costoTipo ?? item.costoTipo ?? 'IMPORTO_FISSO', costoImportoFisso: data.costoImportoFisso, costoPercentuale: data.costoPercentuale }) : {};
  return prisma.insuranceCoverage.update({ where: { id }, data: { ...data, ...costs, ...(data.scopertoFurtoIncendio !== undefined ? { franchigiaFurtoIncendio: data.scopertoFurtoIncendio } : {}) } });
}
export async function deleteCoverage(companyId: string, id: string, deletedBy: string) { const item = await prisma.insuranceCoverage.findFirst({ where: { id, companyId, deletedAt: null } }); if (!item) throw new HttpError(404, 'Copertura non trovata'); return prisma.insuranceCoverage.update({ where: { id }, data: { deletedAt: new Date(), deletedBy, updatedBy: deletedBy } }); }

export async function createMileagePackage(companyId: string, data: z.infer<typeof createMileagePackageSchema> & { createdBy: string }) {
  const costs = normalizeCost(data);
  return prisma.mileagePackage.create({ data: { ...data, ...costs, companyId } });
}
export async function listMileagePackages(companyId: string) { return prisma.mileagePackage.findMany({ where: { companyId, deletedAt: null }, orderBy: { nome: 'asc' } }); }
export async function updateMileagePackage(companyId: string, id: string, data: z.infer<typeof updateMileagePackageSchema> & { updatedBy: string }) {
  const item = await prisma.mileagePackage.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!item) throw new HttpError(404, 'Chilometraggio non trovato');
  const costs = data.costo !== undefined || data.costoTipo !== undefined || data.costoImportoFisso !== undefined || data.costoPercentuale !== undefined ? normalizeCost({ costo: data.costo ?? Number(item.costo ?? 0), costoTipo: data.costoTipo ?? item.costoTipo ?? 'IMPORTO_FISSO', costoImportoFisso: data.costoImportoFisso, costoPercentuale: data.costoPercentuale }) : {};
  return prisma.mileagePackage.update({ where: { id }, data: { ...data, ...costs } });
}
export async function deleteMileagePackage(companyId: string, id: string, deletedBy: string) { const item = await prisma.mileagePackage.findFirst({ where: { id, companyId, deletedAt: null } }); if (!item) throw new HttpError(404, 'Chilometraggio non trovato'); return prisma.mileagePackage.update({ where: { id }, data: { deletedAt: new Date(), deletedBy, updatedBy: deletedBy, attivo: false } }); }

export async function createAdditionalService(companyId: string, data: z.infer<typeof createAdditionalServiceSchema> & { createdBy: string }) {
  const costs = normalizeCost(data);
  return prisma.additionalService.create({ data: { ...data, ...costs, companyId } });
}
export async function listAdditionalServices(companyId: string) { return prisma.additionalService.findMany({ where: { companyId, deletedAt: null }, orderBy: { nome: 'asc' } }); }
export async function updateAdditionalService(companyId: string, id: string, data: z.infer<typeof updateAdditionalServiceSchema> & { updatedBy: string }) {
  const item = await prisma.additionalService.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!item) throw new HttpError(404, 'Servizio aggiuntivo non trovato');
  const costs = data.costo !== undefined || data.costoTipo !== undefined || data.costoImportoFisso !== undefined || data.costoPercentuale !== undefined ? normalizeCost({ costo: data.costo ?? Number(item.costo ?? 0), costoTipo: data.costoTipo ?? item.costoTipo ?? 'IMPORTO_FISSO', costoImportoFisso: data.costoImportoFisso, costoPercentuale: data.costoPercentuale }) : {};
  return prisma.additionalService.update({ where: { id }, data: { ...data, ...costs } });
}
export async function deleteAdditionalService(companyId: string, id: string, deletedBy: string) { const item = await prisma.additionalService.findFirst({ where: { id, companyId, deletedAt: null } }); if (!item) throw new HttpError(404, 'Servizio aggiuntivo non trovato'); return prisma.additionalService.update({ where: { id }, data: { deletedAt: new Date(), deletedBy, updatedBy: deletedBy, attivo: false } }); }

async function resolveBrandingAssets(companyId: string) {
  const [contractLogo, contractStamp] = await Promise.all([getBrandingDocument(companyId, 'COMPANY_LOGO'), getBrandingDocument(companyId, 'COMPANY_STAMP')]);
  return { contractLogo, contractStamp };
}

export async function upsertRentalSettings(companyId: string, data: z.infer<typeof upsertRentalSettingsSchema> & { createdBy: string; updatedBy: string }) {
  const normalized = normalizeCost({ costo: data.costoConducenteAggiuntivo, costoTipo: data.costoConducenteAggiuntivoTipo, costoImportoFisso: data.costoConducenteAggiuntivoImportoFisso, costoPercentuale: data.costoConducenteAggiuntivoPercentuale });
  const values = {
    costoConducenteAggiuntivo: normalized.costo,
    costoConducenteAggiuntivoTipo: normalized.costoTipo,
    costoConducenteAggiuntivoImportoFisso: normalized.costoImportoFisso,
    costoConducenteAggiuntivoPercentuale: normalized.costoPercentuale,
    cauzioneStandard: data.cauzioneStandard,
    costoKmEccedenza: data.costoKmEccedenza,
    penaleCarburante: data.penaleCarburante
  };
  return prisma.rentalSettings.upsert({ where: { companyId }, create: { companyId, ...values, createdBy: data.createdBy }, update: { ...values, updatedBy: data.updatedBy } });
}
export async function getRentalSettings(companyId: string) {
  const [settings, brandingAssets] = await Promise.all([prisma.rentalSettings.findUnique({ where: { companyId } }), resolveBrandingAssets(companyId)]);
  return { companyId, ...(settings ?? {}), ...brandingAssets };
}

export async function createOperator(companyId: string, data: CreateOperator) {
  return prisma.$transaction(async (tx: any) => {
    const accountId = await ensureOperatorAccount(tx, companyId, undefined, data.email, data.password, data.attivo);
    return tx.operator.create({ data: { companyId, nome: data.nome, cognome: data.cognome, telefono: data.telefono, email: data.email, accountId, attivo: data.attivo ?? true, createdBy: data.createdBy, updatedBy: data.createdBy } });
  });
}
export async function listOperators(companyId: string) { return prisma.operator.findMany({ where: { companyId, deletedAt: null }, orderBy: [{ nome: 'asc' }, { cognome: 'asc' }] }); }
export async function updateOperator(companyId: string, id: string, data: UpdateOperator) {
  const current = await prisma.operator.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!current) throw new HttpError(404, 'Operatore non trovato');
  return prisma.$transaction(async (tx: any) => {
    const accountId = await ensureOperatorAccount(tx, companyId, current.accountId, data.email ?? current.email ?? undefined, data.password, data.attivo ?? current.attivo);
    return tx.operator.update({ where: { id }, data: { nome: data.nome, cognome: data.cognome, telefono: data.telefono, email: data.email, accountId, attivo: data.attivo, updatedBy: data.updatedBy } });
  });
}
export async function deleteOperator(companyId: string, id: string, deletedBy: string) {
  const current = await prisma.operator.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!current) throw new HttpError(404, 'Operatore non trovato');
  return prisma.$transaction(async (tx: any) => {
    if (current.accountId) await tx.account.update({ where: { id: current.accountId }, data: { stato: AccountStatus.DISATTIVO } });
    return tx.operator.update({ where: { id }, data: { deletedAt: new Date(), deletedBy, updatedBy: deletedBy, attivo: false } });
  });
}

export async function getConfiguration(companyId: string) {
  const [operatori, copertureAssicurative, chilometraggiGiornalieri, serviziAggiuntivi, impostazioniNoleggio, cargosPortalConfig] = await Promise.all([listOperators(companyId), listCoverages(companyId), listMileagePackages(companyId), listAdditionalServices(companyId), getRentalSettings(companyId), getCargosPortalConfig(companyId)]);
  return { operatori, copertureAssicurative, chilometraggiGiornalieri, serviziAggiuntivi, impostazioniNoleggio, cargosPortalConfig, statiPrenotazione: Object.values(BookingStatus), tipiVeicoli: Object.values(VehicleType), statiVeicoli: Object.values(VehicleStatus), tipiAlimentazioniVeicoli: Object.values(FuelType), cittaItaliaPerProvincia: ITALIAN_CITIES_BY_PROVINCE };
}

type UpsertCargosPortalConfig = z.infer<typeof upsertCargosPortalConfigSchema> & { createdBy: string; updatedBy: string };
type UpdateCargosPortalConfig = z.infer<typeof updateCargosPortalConfigSchema> & { updatedBy: string };

export async function upsertCargosPortalConfig(companyId: string, data: UpsertCargosPortalConfig) {
  return prisma.cargosPortalConfig.upsert({
    where: { companyId },
    create: { companyId, username: data.username, passwordEncrypted: encryptSecret(data.password), apiKeyEncrypted: encryptSecret(data.apiKey), createdBy: data.createdBy, updatedBy: data.updatedBy, deletedAt: null, deletedBy: null },
    update: { username: data.username, passwordEncrypted: encryptSecret(data.password), apiKeyEncrypted: encryptSecret(data.apiKey), updatedBy: data.updatedBy, deletedAt: null, deletedBy: null }
  });
}
export async function getCargosPortalConfig(companyId: string) { return prisma.cargosPortalConfig.findFirst({ where: { companyId, deletedAt: null } }); }
export async function updateCargosPortalConfig(companyId: string, data: UpdateCargosPortalConfig) { const current = await getCargosPortalConfig(companyId); if (!current) throw new HttpError(404, 'Configurazione CARGOS non trovata'); return prisma.cargosPortalConfig.update({ where: { companyId }, data: { ...(data.username !== undefined ? { username: data.username } : {}), ...(data.password !== undefined ? { passwordEncrypted: encryptSecret(data.password) } : {}), ...(data.apiKey !== undefined ? { apiKeyEncrypted: encryptSecret(data.apiKey) } : {}), updatedBy: data.updatedBy } }); }
export async function deleteCargosPortalConfig(companyId: string, deletedBy: string) { const current = await getCargosPortalConfig(companyId); if (!current) throw new HttpError(404, 'Configurazione CARGOS non trovata'); return prisma.cargosPortalConfig.update({ where: { companyId }, data: { deletedAt: new Date(), deletedBy } }); }
export async function getCargosPortalCredentials(companyId: string) { const config = await getCargosPortalConfig(companyId); if (!config) throw new HttpError(404, 'Configurazione CARGOS non trovata'); return { username: config.username, password: decryptSecret(config.passwordEncrypted), apiKey: decryptSecret(config.apiKeyEncrypted) }; }
