import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { HttpError } from '../utils/httpError';
import { contains } from '../utils/filters';
import { toPagination } from '../utils/pagination';
import { addressAutocompleteSchema, createClientSchema, fiscalCodeSchema, searchClientSchema, updateClientSchema } from './client.schemas';
import { z } from 'zod';
import { calculateFiscalCode } from '../config/fiscal-code';

type CreateClient = z.infer<typeof createClientSchema> & { createdBy: string };
type UpdateClient = z.infer<typeof updateClientSchema> & { updatedBy: string };

export async function createClient(companyId: string, data: CreateClient) {
  return prisma.client.create({ data: { ...data, companyId } });
}

export async function getClient(companyId: string, id: string) {
  const client = await prisma.client.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!client) throw new HttpError(404, 'Cliente non trovato');
  return client;
}

export async function updateClient(companyId: string, id: string, data: UpdateClient) {
  await getClient(companyId, id);
  return prisma.client.update({ where: { id }, data });
}

export async function deleteClient(companyId: string, id: string, deletedBy: string) {
  await getClient(companyId, id);
  return prisma.client.update({ where: { id }, data: { deletedAt: new Date(), deletedBy } });
}

export async function searchClients(companyId: string, input: z.infer<typeof searchClientSchema>) {
  const { filter, pagination, sort } = input;
  const where: Prisma.ClientWhereInput = {
    companyId,
    deletedAt: null,
    ...(filter ? { OR: [{ nome: contains(filter) }, { cognome: contains(filter) }, { telefono: contains(filter) }, { codiceFiscale: contains(filter) }] } : {})
  };
  const [items, total] = await prisma.$transaction([
    prisma.client.findMany({ where, ...toPagination(pagination.page, pagination.pageSize), orderBy: { [sort.field]: sort.direction } }),
    prisma.client.count({ where })
  ]);
  return { items, total, page: pagination.page, pageSize: pagination.pageSize };
}

export function generateFiscalCode(input: z.infer<typeof fiscalCodeSchema>) {
  return calculateFiscalCode(input);
}

export async function addressAutocomplete(companyId: string, input: z.infer<typeof addressAutocompleteSchema>) {
  const items = await prisma.client.findMany({
    where: { companyId, deletedAt: null, indirizzoResidenza: contains(input.filter) },
    select: { indirizzoResidenza: true },
    distinct: ['indirizzoResidenza'],
    take: input.limit,
    orderBy: { indirizzoResidenza: 'asc' }
  });
  return { items: items.map((item) => item.indirizzoResidenza) };
}
