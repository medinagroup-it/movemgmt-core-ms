import { BookingStatus, Prisma, VehicleStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { ensureValidRange } from '../utils/dates';
import { contains } from '../utils/filters';
import { HttpError } from '../utils/httpError';
import { toPagination } from '../utils/pagination';
import { rentalDays } from '../utils/rental';
import { availabilitySchema, availableVehiclesSchema, createVehicleSchema, quoteSchema, searchVehicleSchema, updateVehicleSchema } from './vehicle.schemas';

type CreateVehicle = z.infer<typeof createVehicleSchema> & { createdBy: string };
type UpdateVehicle = z.infer<typeof updateVehicleSchema> & { updatedBy: string };

const overlapStatuses = [BookingStatus.CONFERMATA, BookingStatus.IN_CORSO] as BookingStatus[];
const unavailableVehicleStatuses = [VehicleStatus.MANUTENZIONE, VehicleStatus.NON_DISPONIBILE] as VehicleStatus[];

function isVehicleOperational(status: VehicleStatus) {
  return !unavailableVehicleStatuses.includes(status);
}

async function withLastReturnedKm<T extends { id: string; kmAttuali?: any }>(companyId: string, vehicle: T): Promise<T> {
  if (!vehicle) return vehicle;
  const lastReturn = await prisma.booking.findFirst({
    where: {
      companyId,
      veicoloId: vehicle.id,
      deletedAt: null,
      stato: BookingStatus.CONCLUSA,
      kmRiconsegna: { not: null }
    },
    orderBy: [{ dataFineContratto: 'desc' }, { updatedAt: 'desc' }]
  });
  return lastReturn?.kmRiconsegna != null ? { ...vehicle, kmAttuali: lastReturn.kmRiconsegna } : vehicle;
}

async function withLastReturnedKmMany<T extends { id: string; kmAttuali?: any }>(companyId: string, vehicles: T[]): Promise<T[]> {
  return Promise.all(vehicles.map((vehicle) => withLastReturnedKm(companyId, vehicle)));
}


export async function createVehicle(companyId: string, data: CreateVehicle) {
  return prisma.vehicle.create({ data: { ...data, companyId } });
}

export async function getVehicle(companyId: string, id: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!vehicle) throw new HttpError(404, 'Veicolo non trovato');
  return withLastReturnedKm(companyId, vehicle);
}

export async function updateVehicle(companyId: string, id: string, data: UpdateVehicle) {
  await getVehicle(companyId, id);
  return prisma.vehicle.update({ where: { id }, data });
}

export async function deleteVehicle(companyId: string, id: string, deletedBy: string) {
  await getVehicle(companyId, id);
  return prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), deletedBy } });
}

export async function searchVehicles(companyId: string, input: z.infer<typeof searchVehicleSchema>) {
  const { filter, pagination, sort } = input;
  const where: Prisma.VehicleWhereInput = {
    companyId,
    deletedAt: null,
    ...(filter ? { OR: [{ targa: contains(filter) }, { marca: contains(filter) }, { modello: contains(filter) }] } : {})
  };
  const [items, total] = await prisma.$transaction([
    prisma.vehicle.findMany({ where, ...toPagination(pagination.page, pagination.pageSize), orderBy: { [sort.field]: sort.direction } }),
    prisma.vehicle.count({ where })
  ]);
  return { items: await withLastReturnedKmMany(companyId, items), total, page: pagination.page, pageSize: pagination.pageSize };
}

async function conflictsForVehicle(companyId: string, vehicleId: string, start: Date, end: Date) {
  return prisma.booking.findMany({
    where: {
      companyId,
      veicoloId: vehicleId,
      deletedAt: null,
      stato: { in: overlapStatuses },
      dataInizioContratto: { lt: end },
      dataFineContratto: { gt: start }
    },
    include: { cliente: true, veicolo: true },
    orderBy: { dataInizioContratto: 'asc' }
  });
}

export async function checkAvailability(companyId: string, input: z.infer<typeof availabilitySchema>) {
  ensureValidRange(input.dataInizioContratto, input.dataFineContratto);
  const vehicle = await prisma.vehicle.findFirst({ where: { companyId, targa: input.targa, deletedAt: null } });
  if (!vehicle) throw new HttpError(404, 'Veicolo non trovato');
  const conflictingBookings = await conflictsForVehicle(companyId, vehicle.id, input.dataInizioContratto, input.dataFineContratto);
  return {
    available: conflictingBookings.length === 0 && isVehicleOperational(vehicle.stato),
    vehicleId: vehicle.id,
    targa: vehicle.targa,
    conflictingBookings,
    unavailableReason: !isVehicleOperational(vehicle.stato) ? `Veicolo in stato ${vehicle.stato}` : undefined
  };
}

export async function calculateRentalQuote(companyId: string, input: z.infer<typeof quoteSchema>) {
  ensureValidRange(input.dataInizioContratto, input.dataFineContratto);
  const vehicle = await prisma.vehicle.findFirst({ where: { companyId, targa: input.targa, deletedAt: null } });
  if (!vehicle) throw new HttpError(404, 'Veicolo non trovato');
  const giorni = rentalDays(input.dataInizioContratto, input.dataFineContratto);
  const costoGiornaliero = Number(vehicle.costoGiornaliero);
  return { targa: vehicle.targa, vehicleId: vehicle.id, costoGiornaliero, giorniNoleggio: giorni, prezzoIndicativo: costoGiornaliero * giorni };
}

function unavailableDays(start: Date, end: Date, conflicts: { dataInizioContratto: Date; dataFineContratto: Date }[]) {
  const days: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    if (conflicts.some((c) => c.dataInizioContratto < dayEnd && c.dataFineContratto > dayStart)) days.push(dayStart.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function findAvailableVehicles(companyId: string, input: z.infer<typeof availableVehiclesSchema>) {
  ensureValidRange(input.dataInizioContratto, input.dataFineContratto);
  const vehicles = await prisma.vehicle.findMany({
    where: {
      companyId,
      tipo: input.tipo,
      deletedAt: null,
      stato: { notIn: unavailableVehicleStatuses }
    },
    orderBy: { targa: 'asc' }
  });
  const evaluated = await Promise.all(vehicles.map(async (vehicle) => {
    const conflicts = await conflictsForVehicle(companyId, vehicle.id, input.dataInizioContratto, input.dataFineContratto);
    return { vehicle, conflicts, unavailableDays: unavailableDays(input.dataInizioContratto, input.dataFineContratto, conflicts) };
  }));
  const availableVehicles = evaluated.filter((item) => item.conflicts.length === 0).map((item) => item.vehicle);
  if (availableVehicles.length > 0) return { available: true, vehicles: await withLastReturnedKmMany(companyId, availableVehicles), message: 'Veicoli disponibili trovati' };
  const alternatives = await Promise.all(evaluated.sort((a, b) => a.unavailableDays.length - b.unavailableDays.length).slice(0, 5).map(async (item) => ({
    vehicle: await withLastReturnedKm(companyId, item.vehicle),
    unavailableDays: item.unavailableDays,
    message: `Il veicolo ${item.vehicle.targa} non e disponibile nelle seguenti giornate: ${item.unavailableDays.join(', ')}`
  })));
  return { available: false, vehicles: [], message: 'Nessun veicolo dello stesso tipo e disponibile per tutte le giornate richieste', alternatives };
}
