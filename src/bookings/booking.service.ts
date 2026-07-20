import { BookingStatus, DamageStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ensureValidRange } from "../utils/dates";
import { contains, equals, removeUndefined } from "../utils/filters";
import { HttpError } from "../utils/httpError";
import { toPagination } from "../utils/pagination";
import {
  bookingDeliverySchema,
  bookingReturnSchema,
  createBookingSchema,
  createDraftBookingSchema,
  findByFineSchema,
  searchBookingSchema,
  updateBookingSchema,
} from "./booking.schemas";

type CreateBooking = z.infer<typeof createBookingSchema> & {
  createdBy: string;
};
type CreateDraftBooking = z.infer<typeof createDraftBookingSchema> & {
  createdBy: string;
};
type UpdateBooking = z.infer<typeof updateBookingSchema> & {
  updatedBy: string;
};
type BookingDelivery = z.infer<typeof bookingDeliverySchema> & {
  updatedBy: string;
};
type BookingReturn = z.infer<typeof bookingReturnSchema> & {
  updatedBy: string;
};
const overlapStatuses = [
  BookingStatus.CONFERMATA,
  BookingStatus.IN_CORSO,
] as BookingStatus[];
const bookingInclude = {
  cliente: true,
  conducenteAggiuntivo: true,
  billingData: true,
  veicolo: true,
  operator: true,
  copertura: true,
  mileagePackage: true,
  serviziAggiuntivi: { include: { additionalService: true } },
};

function decimalNumber(value: any): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value.toNumber === "function") return value.toNumber();
  return Number(value) || 0;
}

function mileagePackageDailyKm(item: any): number | null | undefined {
  if (!item?.nome) return undefined;
  const normalized = String(item.nome).trim().toLowerCase();
  if (normalized.includes("illimit")) return null;
  const match = normalized.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function calculateReturnPenalties(
  booking: any,
  data: BookingReturn,
  settings: any,
) {
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(booking.dataFineContratto).getTime() -
        new Date(booking.dataInizioContratto).getTime()) /
        86400000,
    ),
  );
  const dailyKm =
    booking.chilometraggioGiornaliero ??
    mileagePackageDailyKm(booking.mileagePackage);
  const kmConsegna = Number(booking.kmConsegna ?? booking.kmInizio ?? 0);
  const allowedKm =
    typeof dailyKm === "number" ? kmConsegna + dailyKm * days : null;
  const kmEccedenza =
    allowedKm != null ? Math.max(0, Number(data.kmRiconsegna) - allowedKm) : 0;
  const costoKmEccedenza = decimalNumber(settings?.costoKmEccedenza);
  const importoPenaleKm = kmEccedenza * costoKmEccedenza;
  const fuelShortage =
    Number(data.livelloCarburanteRiconsegna) <
    Number(booking.livelloCarburanteConsegna ?? 0);
  const importoPenaleCarburante = fuelShortage
    ? decimalNumber(settings?.penaleCarburante)
    : 0;
  const totaleAutomatico = Number(
    (importoPenaleKm + importoPenaleCarburante).toFixed(2),
  );
  const importoPenali =
    data.importoPenali != null ? Number(data.importoPenali) : totaleAutomatico;
  return {
    days,
    dailyKm,
    allowedKm,
    kmEccedenza,
    importoPenaleKm,
    importoPenaleCarburante,
    totaleAutomatico,
    importoPenali,
  };
}

async function hydrateBookingOperationalFields<T extends any>(
  companyId: string,
  bookings: T[],
): Promise<T[]> {
  const ids = bookings.map((booking: any) => booking?.id).filter(Boolean);
  if (!ids.length) return bookings;
  try {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        "id",
        "consegnaEffettuataAt",
        "importoCauzione",
        "metodoPagamentoCauzione",
        "codicePreautorizzazioneCauzione",
        "livelloCarburanteConsegna",
        "kmConsegna",
        "riconsegnaEffettuataAt",
        "livelloCarburanteRiconsegna",
        "kmRiconsegna",
        "cauzioneRestituita",
        "cauzioneTrattenuta",
        "noteRiconsegna",
        "kmEccedenza",
        "importoPenaleKm",
        "importoPenaleCarburante",
        "importoPenali",
        "metodoPagamentoPenali"
      FROM "Booking"
      WHERE "companyId" = ${companyId} AND "id" IN (${Prisma.join(ids)})
    `);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return bookings.map((booking: any) => ({
      ...booking,
      ...(byId.get(booking.id) ?? {}),
    }));
  } catch (_) {
    return bookings;
  }
}

async function hydrateBookingOperationalField<T extends any>(
  companyId: string,
  booking: T | null,
): Promise<T | null> {
  if (!booking) return booking;
  const [hydrated] = await hydrateBookingOperationalFields(companyId, [
    booking,
  ]);
  return hydrated;
}

async function getLastReturnedBookingForVehicle(
  companyId: string,
  currentBookingId: string,
  vehicleId: string,
) {
  try {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "id", "dataFineContratto", "riconsegnaEffettuataAt", "kmRiconsegna", "livelloCarburanteRiconsegna"
      FROM "Booking"
      WHERE "companyId" = ${companyId}
        AND "id" <> ${currentBookingId}
        AND "veicoloId" = ${vehicleId}
        AND "deletedAt" IS NULL
        AND "stato" = 'CONCLUSA'
        AND "riconsegnaEffettuataAt" IS NOT NULL
        AND ("kmRiconsegna" IS NOT NULL OR "livelloCarburanteRiconsegna" IS NOT NULL)
      ORDER BY "dataFineContratto" DESC, "riconsegnaEffettuataAt" DESC
      LIMIT 1
    `);
    return rows[0] ?? null;
  } catch (_) {
    return null;
  }
}

async function assertVehicle(companyId: string, veicoloId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: veicoloId, companyId, deletedAt: null },
  });
  if (!vehicle) throw new HttpError(404, "Veicolo non trovato");
}
async function assertClient(
  companyId: string,
  clienteId: string,
  label = "Cliente",
) {
  const c = await prisma.client.findFirst({
    where: { id: clienteId, companyId, deletedAt: null },
  });
  if (!c) throw new HttpError(404, `${label} non trovato`);
}
async function assertBilling(
  companyId: string,
  billingDataId: string,
  clienteId: string,
) {
  const b = await prisma.billingData.findFirst({
    where: { id: billingDataId, companyId, clienteId, deletedAt: null },
  });
  if (!b)
    throw new HttpError(
      404,
      "Dati di fatturazione non trovati o non associati al conducente principale",
    );
}
async function assertOptionalConfig(
  companyId: string,
  operatorId?: string | null,
  coverageId?: string | null,
  mileagePackageId?: string | null,
  servicesIds: string[] = [],
) {
  if (
    operatorId &&
    !(await prisma.operator.findFirst({
      where: { id: operatorId, companyId, deletedAt: null, attivo: true },
    }))
  )
    throw new HttpError(404, "Operatore non trovato o non attivo");
  if (
    coverageId &&
    !(await prisma.insuranceCoverage.findFirst({
      where: { id: coverageId, companyId, deletedAt: null },
    }))
  )
    throw new HttpError(404, "Copertura assicurativa non trovata");
  if (
    mileagePackageId &&
    !(await prisma.mileagePackage.findFirst({
      where: { id: mileagePackageId, companyId, deletedAt: null, attivo: true },
    }))
  )
    throw new HttpError(
      404,
      "Chilometraggio giornaliero non trovato o non attivo",
    );
  if (servicesIds.length) {
    const count = await prisma.additionalService.count({
      where: {
        id: { in: servicesIds },
        companyId,
        deletedAt: null,
        attivo: true,
      },
    });
    if (count !== new Set(servicesIds).size)
      throw new HttpError(404, "Uno o piu servizi aggiuntivi non sono validi");
  }
}
async function assertNoOverlap(
  companyId: string,
  veicoloId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string,
) {
  const conflict = await prisma.booking.findFirst({
    where: {
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      companyId,
      veicoloId,
      deletedAt: null,
      stato: { in: overlapStatuses },
      dataInizioContratto: { lt: end },
      dataFineContratto: { gt: start },
    },
  });
  if (conflict)
    throw new HttpError(409, "Veicolo non disponibile nel periodo richiesto", {
      conflictingBookingId: conflict.id,
    });
}
async function resolveInlineData(
  tx: any,
  companyId: string,
  data: CreateBooking | CreateDraftBooking,
) {
  let clienteId = data.clienteId;
  if (!clienteId && data.nuovoCliente)
    clienteId = (
      await tx.client.create({
        data: { ...data.nuovoCliente, companyId, createdBy: data.createdBy },
      })
    ).id;
  if (!clienteId) throw new HttpError(400, "Cliente principale obbligatorio");
  let conducenteAggiuntivoId = data.conducenteAggiuntivoId;
  if (!conducenteAggiuntivoId && data.nuovoConducenteAggiuntivo)
    conducenteAggiuntivoId = (
      await tx.client.create({
        data: {
          ...data.nuovoConducenteAggiuntivo,
          companyId,
          createdBy: data.createdBy,
        },
      })
    ).id;
  let billingDataId = data.billingDataId;
  if (!billingDataId && data.nuoviDatiFatturazione)
    billingDataId = (
      await tx.billingData.create({
        data: {
          ...data.nuoviDatiFatturazione,
          companyId,
          clienteId,
          createdBy: data.createdBy,
        },
      })
    ).id;
  return { clienteId, conducenteAggiuntivoId, billingDataId };
}
function bookingData(
  data: any,
  resolved: any,
  status: BookingStatus,
  companyId: string,
) {
  const {
    nuovoCliente,
    nuovoConducenteAggiuntivo,
    nuoviDatiFatturazione,
    serviziAggiuntiviIds,
    stato,
    ...rest
  } = data;
  return { ...rest, ...resolved, companyId, stato: status };
}
async function createBookingWithStatus(
  companyId: string,
  data: CreateBooking | CreateDraftBooking,
  status: BookingStatus,
) {
  ensureValidRange(data.dataInizioContratto, data.dataFineContratto);
  await assertVehicle(companyId, data.veicoloId);
  if (data.clienteId)
    await assertClient(companyId, data.clienteId, "Cliente principale");
  if (data.conducenteAggiuntivoId)
    await assertClient(
      companyId,
      data.conducenteAggiuntivoId,
      "Conducente aggiuntivo",
    );
  if (data.billingDataId && data.clienteId)
    await assertBilling(companyId, data.billingDataId, data.clienteId);
  await assertOptionalConfig(
    companyId,
    data.operatorId,
    data.coperturaAssicurativaId,
    data.mileagePackageId,
    data.serviziAggiuntiviIds,
  );
  if (status !== BookingStatus.BOZZA)
    await assertNoOverlap(
      companyId,
      data.veicoloId,
      data.dataInizioContratto,
      data.dataFineContratto,
    );
  return prisma.$transaction(async (tx: any) => {
    const resolved = await resolveInlineData(tx, companyId, data);
    const booking = await tx.booking.create({
      data: bookingData(data, resolved, status, companyId),
    });
    if (data.serviziAggiuntiviIds?.length)
      await tx.bookingAdditionalService.createMany({
        data: [...new Set(data.serviziAggiuntiviIds)].map(
          (additionalServiceId) => ({
            companyId,
            bookingId: booking.id,
            additionalServiceId,
            createdBy: data.createdBy,
          }),
        ),
      });
    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude,
    });
  });
}
export async function createBooking(companyId: string, data: CreateBooking) {
  return createBookingWithStatus(companyId, data, BookingStatus.CONFERMATA);
}
export async function createDraftBooking(
  companyId: string,
  data: CreateDraftBooking,
) {
  return createBookingWithStatus(companyId, data, BookingStatus.BOZZA);
}
export async function getBooking(companyId: string, id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, companyId, deletedAt: null },
    include: bookingInclude,
  });
  if (!booking) throw new HttpError(404, "Prenotazione non trovata");
  return hydrateBookingOperationalField(companyId, booking) as Promise<any>;
}
export async function updateBooking(
  companyId: string,
  id: string,
  data: UpdateBooking,
) {
  const current = await getBooking(companyId, id);
  const veicoloId = data.veicoloId ?? current.veicoloId;
  const start = data.dataInizioContratto ?? current.dataInizioContratto;
  const end = data.dataFineContratto ?? current.dataFineContratto;
  ensureValidRange(start, end);
  if (data.veicoloId) await assertVehicle(companyId, veicoloId);
  if (data.clienteId) await assertClient(companyId, data.clienteId);
  if (data.conducenteAggiuntivoId)
    await assertClient(
      companyId,
      data.conducenteAggiuntivoId,
      "Conducente aggiuntivo",
    );
  const clienteId = data.clienteId ?? current.clienteId;
  if (data.billingDataId)
    await assertBilling(companyId, data.billingDataId, clienteId);
  await assertOptionalConfig(
    companyId,
    data.operatorId ?? current.operatorId,
    data.coperturaAssicurativaId ?? current.coperturaAssicurativaId,
    data.mileagePackageId ?? current.mileagePackageId,
    data.serviziAggiuntiviIds,
  );
  if (
    current.stato !== BookingStatus.BOZZA &&
    current.stato !== BookingStatus.ANNULLATA
  )
    await assertNoOverlap(companyId, veicoloId, start, end, id);
  const { serviziAggiuntiviIds, ...updateData } = data as any;
  return prisma.$transaction(async (tx: any) => {
    await tx.booking.update({ where: { id }, data: updateData });
    if (serviziAggiuntiviIds) {
      const uniqueServiziAggiuntiviIds = Array.from(
        new Set(serviziAggiuntiviIds as string[]),
      );
      await tx.bookingAdditionalService.deleteMany({
        where: { bookingId: id, companyId },
      });
      if (uniqueServiziAggiuntiviIds.length)
        await tx.bookingAdditionalService.createMany({
          data: uniqueServiziAggiuntiviIds.map((additionalServiceId) => ({
            companyId,
            bookingId: id,
            additionalServiceId,
            createdBy: data.updatedBy,
          })),
        });
    }
    return tx.booking.findUnique({ where: { id }, include: bookingInclude });
  });
}
export async function cancelBooking(
  companyId: string,
  id: string,
  updatedBy: string,
  note?: string,
) {
  await getBooking(companyId, id);
  return prisma.booking.update({
    where: { id },
    data: { stato: BookingStatus.ANNULLATA, updatedBy, note },
    include: bookingInclude,
  });
}
export async function deleteBooking(
  companyId: string,
  id: string,
  deletedBy: string,
) {
  await getBooking(companyId, id);
  return prisma.booking.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy },
    include: bookingInclude,
  });
}
export async function searchBookings(
  companyId: string,
  input: z.infer<typeof searchBookingSchema>,
) {
  const { filter, pagination, sort } = input;
  const where: Prisma.BookingWhereInput = removeUndefined({
    companyId,
    deletedAt: null,
    clienteId: equals(filter.clienteId),
    veicoloId: equals(filter.veicoloId),
    stato: equals(filter.stato),
    metodoPagamento: equals(filter.metodoPagamento),
    nomeOperatore: contains(filter.nomeOperatore),
    dataInizioContratto: removeUndefined({
      gte: filter.dataInizioContrattoDa,
      lte: filter.dataInizioContrattoA,
    }),
    dataFineContratto: removeUndefined({
      gte: filter.dataFineContrattoDa,
      lte: filter.dataFineContrattoA,
    }),
    dataEmissioneFattura: removeUndefined({
      gte: filter.dataEmissioneFatturaDa,
      lte: filter.dataEmissioneFatturaA,
    }),
    cliente: removeUndefined({
      companyId,
      nome: contains(filter.nomeCliente),
      cognome: contains(filter.cognomeCliente),
      codiceFiscale: contains(filter.codiceFiscale),
      deletedAt: null,
    }),
    veicolo: removeUndefined({
      companyId,
      targa: contains(filter.targa),
      deletedAt: null,
    }),
  });
  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      ...toPagination(pagination.page, pagination.pageSize),
      orderBy: { [sort.field]: sort.direction },
    }),
    prisma.booking.count({ where }),
  ]);
  return {
    items: await hydrateBookingOperationalFields(companyId, items),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}
export async function findBookingByFine(
  companyId: string,
  input: z.infer<typeof findByFineSchema>,
) {
  const booking = await prisma.booking.findFirst({
    where: {
      companyId,
      deletedAt: null,
      stato: {
        in: [
          BookingStatus.CONFERMATA,
          BookingStatus.IN_CORSO,
          BookingStatus.CONCLUSA,
        ],
      },
      dataInizioContratto: { lte: input.dataMulta },
      dataFineContratto: { gte: input.dataMulta },
      veicolo: { companyId, targa: input.targa, deletedAt: null },
      cliente: { companyId, deletedAt: null },
    },
    include: bookingInclude,
    orderBy: { dataInizioContratto: "desc" },
  });
  if (!booking)
    throw new HttpError(
      404,
      "Nessuna prenotazione trovata per targa e data multa",
    );
  return { booking };
}

export async function getDeliveryDefaults(companyId: string, id: string) {
  const booking = await getBooking(companyId, id);
  const lastReturn = await getLastReturnedBookingForVehicle(
    companyId,
    id,
    booking.veicoloId,
  );
  const settings = await prisma.rentalSettings.findUnique({
    where: { companyId },
  });
  return {
    livelloCarburanteConsegna: lastReturn?.livelloCarburanteRiconsegna ?? null,
    kmConsegna: lastReturn?.kmRiconsegna ?? booking.veicolo?.kmAttuali ?? null,
    importoCauzione: settings?.cauzioneStandard ?? null,
    costoKmEccedenza: settings?.costoKmEccedenza ?? null,
    penaleCarburante: settings?.penaleCarburante ?? null,
    sourceBookingId: lastReturn?.id ?? null,
    sourceDataFineContratto: lastReturn?.dataFineContratto ?? null,
  };
}

export async function deliverBooking(
  companyId: string,
  id: string,
  data: BookingDelivery,
) {
  const booking = await getBooking(companyId, id);
  if (
    booking.stato === BookingStatus.ANNULLATA ||
    booking.stato === BookingStatus.CONCLUSA
  )
    throw new HttpError(
      400,
      "Prenotazione annullata o conclusa: consegna non consentita",
    );
  if (booking.consegnaEffettuataAt)
    throw new HttpError(409, "Consegna gia effettuata");
  await prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE "Booking" SET
        "consegnaEffettuataAt" = NOW(),
        "importoCauzione" = ${data.importoCauzione},
        "metodoPagamentoCauzione" = ${data.metodoPagamentoCauzione}::"DepositPaymentMethod",
        "codicePreautorizzazioneCauzione" = ${data.metodoPagamentoCauzione === "CARTA" ? (data.codicePreautorizzazioneCauzione ?? null) : null},
        "livelloCarburanteConsegna" = ${data.livelloCarburanteConsegna},
        "kmConsegna" = ${data.kmConsegna},
        "kmInizio" = ${data.kmConsegna},
        "stato" = ${BookingStatus.IN_CORSO}::"BookingStatus",
        "updatedBy" = ${data.updatedBy}
      WHERE "id" = ${id} AND "companyId" = ${companyId}
    `);
    await tx.vehicle.update({
      where: { id: booking.veicoloId },
      data: {
        stato: "NOLEGGIATO",
        kmAttuali: data.kmConsegna,
        updatedBy: data.updatedBy,
      },
    });
  });
  return getBooking(companyId, id);
}

export async function returnBooking(
  companyId: string,
  id: string,
  data: BookingReturn,
) {
  const booking = await getBooking(companyId, id);
  if (!booking.consegnaEffettuataAt)
    throw new HttpError(400, "Effettuare prima la consegna");
  if (booking.riconsegnaEffettuataAt)
    throw new HttpError(409, "Riconsegna gia effettuata");
  if (booking.stato === BookingStatus.ANNULLATA)
    throw new HttpError(
      400,
      "Prenotazione annullata: riconsegna non consentita",
    );
  const settings = await prisma.rentalSettings.findUnique({
    where: { companyId },
  });
  const penalties = calculateReturnPenalties(booking, data, settings);
  await prisma.$transaction(async (tx: any) => {
    const metodoPagamentoCauzione =
      data.metodoPagamentoCauzione ?? booking.metodoPagamentoCauzione ?? null;
    const codicePreautorizzazioneCauzione =
      metodoPagamentoCauzione === "CARTA"
        ? (data.codicePreautorizzazioneCauzione ??
          booking.codicePreautorizzazioneCauzione ??
          null)
        : null;
    await tx.$executeRaw(Prisma.sql`
      UPDATE "Booking" SET
        "riconsegnaEffettuataAt" = NOW(),
        "livelloCarburanteRiconsegna" = ${data.livelloCarburanteRiconsegna},
        "kmRiconsegna" = ${data.kmRiconsegna},
        "cauzioneRestituita" = ${data.cauzioneRestituita ?? false},
        "cauzioneTrattenuta" = ${data.cauzioneTrattenuta ?? false},
        "metodoPagamentoCauzione" = ${metodoPagamentoCauzione}::"DepositPaymentMethod",
        "codicePreautorizzazioneCauzione" = ${codicePreautorizzazioneCauzione},
        "noteRiconsegna" = ${data.noteRiconsegna ?? null},
        "kmEccedenza" = ${penalties.kmEccedenza},
        "importoPenaleKm" = ${penalties.importoPenaleKm},
        "importoPenaleCarburante" = ${penalties.importoPenaleCarburante},
        "importoPenali" = ${penalties.importoPenali},
        "metodoPagamentoPenali" = ${penalties.importoPenali > 0 ? (data.metodoPagamentoPenali ?? null) : null}::"PaymentMethod",
        "stato" = ${BookingStatus.CONCLUSA}::"BookingStatus",
        "updatedBy" = ${data.updatedBy}
      WHERE "id" = ${id} AND "companyId" = ${companyId}
    `);
    await tx.vehicle.update({
      where: { id: booking.veicoloId },
      data: {
        stato: "DISPONIBILE",
        kmAttuali: data.kmRiconsegna,
        updatedBy: data.updatedBy,
      },
    });
    if (data.nuoviDanni?.length) {
      await tx.vehicleDamage.createMany({
        data: data.nuoviDanni.map((damage) => ({
          companyId,
          veicoloId: booking.veicoloId,
          note: damage.note,
          x: damage.x,
          y: damage.y,
          stato: damage.stato ?? DamageStatus.APERTO,
          createdBy: data.updatedBy,
          updatedBy: data.updatedBy,
        })),
      });
    }
  });
  return getBooking(companyId, id);
}
