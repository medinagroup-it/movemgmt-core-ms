import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { HttpError } from '../utils/httpError';
import { contains } from '../utils/filters';
import { toPagination } from '../utils/pagination';
import { createBillingDataSchema, searchBillingDataSchema, updateBillingDataSchema } from './billing-data.schemas';

type CreateBillingData = z.infer<typeof createBillingDataSchema> & { createdBy: string };
type UpdateBillingData = z.infer<typeof updateBillingDataSchema> & { updatedBy: string };

async function assertClient(companyId: string, clienteId: string) {
  const client = await prisma.client.findFirst({ where: { id: clienteId, companyId, deletedAt: null } });
  if (!client) throw new HttpError(404, 'Cliente non trovato');
}
export async function createBillingData(companyId: string, data: CreateBillingData) { await assertClient(companyId, data.clienteId); return prisma.billingData.create({ data: { ...data, companyId }, include: { cliente: true } }); }
export async function getBillingData(companyId: string, id: string) { const item = await prisma.billingData.findFirst({ where: { id, companyId, deletedAt: null }, include: { cliente: true } }); if (!item) throw new HttpError(404, 'Dati fatturazione non trovati'); return item; }
export async function updateBillingData(companyId: string, id: string, data: UpdateBillingData) { await getBillingData(companyId, id); if (data.clienteId) await assertClient(companyId, data.clienteId); return prisma.billingData.update({ where: { id }, data, include: { cliente: true } }); }
export async function deleteBillingData(companyId: string, id: string, deletedBy: string) { await getBillingData(companyId, id); return prisma.billingData.update({ where: { id }, data: { deletedAt: new Date(), deletedBy }, include: { cliente: true } }); }
export async function searchBillingData(companyId: string, input: z.infer<typeof searchBillingDataSchema>) {
  const { filter, clienteId, pagination } = input;
  const where: Prisma.BillingDataWhereInput = { companyId, deletedAt: null, clienteId, ...(filter ? { OR: [{ ragioneSociale: contains(filter) }, { partitaIva: contains(filter) }, { codiceFiscale: contains(filter) }, { indirizzoSedeLegale: contains(filter) }] } : {}) };
  const [items, total] = await prisma.$transaction([prisma.billingData.findMany({ where, include: { cliente: true }, ...toPagination(pagination.page, pagination.pageSize), orderBy: { ragioneSociale: 'asc' } }), prisma.billingData.count({ where })]);
  return { items, total, page: pagination.page, pageSize: pagination.pageSize };
}
