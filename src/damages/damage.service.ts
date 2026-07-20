import { DamageStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { contains, equals, removeUndefined } from '../utils/filters';
import { HttpError } from '../utils/httpError';
import { toPagination } from '../utils/pagination';
import { createDamageSchema, searchDamageSchema, updateDamageSchema } from './damage.schemas';

type CreateDamage = z.infer<typeof createDamageSchema> & { createdBy: string };
type UpdateDamage = z.infer<typeof updateDamageSchema> & { updatedBy: string };

async function assertVehicle(companyId: string, id: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!vehicle) throw new HttpError(404, 'Veicolo non trovato');
  return vehicle;
}

export async function createDamage(companyId: string, veicoloId: string, data: CreateDamage) {
  await assertVehicle(companyId, veicoloId);
  return prisma.vehicleDamage.create({ data: { ...data, companyId, veicoloId }, include: { veicolo: true } });
}

export async function getDamage(companyId: string, id: string) {
  const damage = await prisma.vehicleDamage.findFirst({ where: { id, companyId, deletedAt: null }, include: { veicolo: true } });
  if (!damage) throw new HttpError(404, 'Danno non trovato');
  return damage;
}

export async function updateDamage(companyId: string, id: string, data: UpdateDamage) {
  await getDamage(companyId, id);
  const updateData: any = { ...data };
  if (data.stato === DamageStatus.RIPARATO) updateData.dataRiparazione = new Date();
  if (data.stato === DamageStatus.APERTO) updateData.dataRiparazione = null;
  return prisma.vehicleDamage.update({ where: { id }, data: updateData, include: { veicolo: true } });
}

export async function repairDamage(companyId: string, id: string, updatedBy: string) {
  await getDamage(companyId, id);
  return prisma.vehicleDamage.update({
    where: { id },
    data: { stato: DamageStatus.RIPARATO, dataRiparazione: new Date(), updatedBy },
    include: { veicolo: true }
  });
}

export async function deleteDamage(companyId: string, id: string, deletedBy: string) {
  await getDamage(companyId, id);
  return prisma.vehicleDamage.update({ where: { id }, data: { deletedAt: new Date(), deletedBy } });
}

export async function listDamagesByVehicle(companyId: string, veicoloId: string) {
  await assertVehicle(companyId, veicoloId);
  return prisma.vehicleDamage.findMany({ where: { companyId, veicoloId, deletedAt: null }, orderBy: { dataAggiunta: 'desc' } });
}

export async function searchDamages(companyId: string, input: z.infer<typeof searchDamageSchema>) {
  const { filter, pagination, sort } = input;
  const where: Prisma.VehicleDamageWhereInput = removeUndefined({
    companyId,
    deletedAt: null,
    veicoloId: equals(filter.veicoloId),
    stato: equals(filter.stato),
    note: contains(filter.note),
    dataAggiunta: removeUndefined({ gte: filter.dataAggiuntaDa, lte: filter.dataAggiuntaA }),
    veicolo: removeUndefined({ companyId, targa: contains(filter.targa), deletedAt: null })
  });
  const [items, total] = await prisma.$transaction([
    prisma.vehicleDamage.findMany({ where, include: { veicolo: true }, ...toPagination(pagination.page, pagination.pageSize), orderBy: { [sort.field]: sort.direction } }),
    prisma.vehicleDamage.count({ where })
  ]);
  return { items, total, page: pagination.page, pageSize: pagination.pageSize };
}
