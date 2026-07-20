import { BookingStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { HttpError } from '../utils/httpError';
import { contains, removeUndefined } from '../utils/filters';
import { toPagination } from '../utils/pagination';
import { createFineSchema, searchFineSchema, updateFineSchema } from './fine.schemas';

type CreateFine = z.infer<typeof createFineSchema> & { createdBy: string };
type UpdateFine = z.infer<typeof updateFineSchema> & { updatedBy: string };

async function findRelatedBooking(companyId: string, targa: string, dataMulta: Date) {
  return prisma.booking.findFirst({
    where: { companyId, deletedAt: null, stato: { in: [BookingStatus.CONFERMATA, BookingStatus.IN_CORSO, BookingStatus.CONCLUSA] }, dataInizioContratto: { lte: dataMulta }, dataFineContratto: { gte: dataMulta }, veicolo: { companyId, targa, deletedAt: null } },
    include: { cliente: true, conducenteAggiuntivo: true, billingData: true, veicolo: true, operator: true, copertura: true, mileagePackage: true, serviziAggiuntivi: { include: { additionalService: true } } },
    orderBy: { dataInizioContratto: 'desc' }
  });
}
export async function createFine(companyId: string, data: CreateFine) {
  const vehicle = await prisma.vehicle.findFirst({ where: { companyId, targa: data.targa, deletedAt: null } }); if (!vehicle) throw new HttpError(404, 'Veicolo non trovato');
  const booking = await findRelatedBooking(companyId, data.targa, data.dataMulta);
  if (!booking) throw new HttpError(404, 'Nessuna prenotazione associata trovata per targa e data multa');
  return prisma.fine.create({ data: { companyId, veicoloId: vehicle.id, bookingId: booking.id, targa: vehicle.targa, dataMulta: data.dataMulta, importo: data.importo, dataNotifica: data.dataNotifica, luogoInfrazione: data.luogoInfrazione, dataRinotifica: data.dataRinotifica, note: data.note, createdBy: data.createdBy }, include: { veicolo: true, booking: { include: { cliente: true, conducenteAggiuntivo: true, billingData: true, veicolo: true, operator: true, copertura: true, mileagePackage: true, serviziAggiuntivi: { include: { additionalService: true } } } } } });
}
export async function getFine(companyId: string, id: string) { const fine = await prisma.fine.findFirst({ where: { id, companyId, deletedAt: null }, include: { veicolo: true, booking: { include: { cliente: true, conducenteAggiuntivo: true, billingData: true, veicolo: true, operator: true, copertura: true, mileagePackage: true, serviziAggiuntivi: { include: { additionalService: true } } } } } }); if (!fine) throw new HttpError(404, 'Multa non trovata'); return fine; }
export async function updateFine(companyId: string, id: string, data: UpdateFine) { await getFine(companyId, id); return prisma.fine.update({ where: { id }, data, include: { veicolo: true, booking: { include: { cliente: true, conducenteAggiuntivo: true, billingData: true, veicolo: true, operator: true, copertura: true, mileagePackage: true, serviziAggiuntivi: { include: { additionalService: true } } } } } }); }
export async function deleteFine(companyId: string, id: string, deletedBy: string) { await getFine(companyId, id); return prisma.fine.update({ where: { id }, data: { deletedAt: new Date(), deletedBy }, include: { veicolo: true, booking: true } }); }
export async function searchFines(companyId: string, input: z.infer<typeof searchFineSchema>) {
  const { filter, pagination } = input;
  const where: Prisma.FineWhereInput = removeUndefined({ companyId, deletedAt: null, veicoloId: filter.veicoloId, bookingId: filter.bookingId, targa: contains(filter.targa), dataMulta: removeUndefined({ gte: filter.dataMultaDa, lte: filter.dataMultaA }) });
  const [items, total] = await prisma.$transaction([prisma.fine.findMany({ where, include: { veicolo: true, booking: { include: { cliente: true, conducenteAggiuntivo: true, billingData: true, veicolo: true, operator: true, copertura: true, mileagePackage: true, serviziAggiuntivi: { include: { additionalService: true } } } } }, ...toPagination(pagination.page, pagination.pageSize), orderBy: { dataMulta: 'desc' } }), prisma.fine.count({ where })]);
  return { items, total, page: pagination.page, pageSize: pagination.pageSize };
}
