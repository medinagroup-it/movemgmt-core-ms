import { randomBytes } from 'crypto';
import { prisma } from '../db/prisma';
import { HttpError } from '../utils/httpError';
import { extractPlaceholders, renderHtml } from './lib/template.renderer';
import { pdfGenerator } from './pdf/pdf.generator';
import type { SignatureImageInput } from './lib/signature.renderer';
import { documentAssetBufferToDataUrl, getBrandingDocument, readDocumentAssetBuffer, saveDocumentAsset, toDocumentAssetDto } from '../documents/document-storage.service';
import { env } from '../config/env';

type CreateTemplateInput = { name: string; html: string; isDefault?: boolean; createdBy: string };
type UpdateTemplateInput = { name?: string; html?: string; updatedBy: string };
type GenerateContractInput = { bookingId?: string; templateCode?: string; placeholder?: Record<string, unknown>; signature?: { client?: SignatureImageInput }; pdf?: Record<string, unknown> };
type RenderContractHtmlInput = { bookingId?: string; templateCode?: string; placeholder?: Record<string, unknown>; signArea?: { client?: { text?: string; className?: string; style?: string } } };
type SaveSignedContractDocumentInput = { bookingId: string; templateCode?: string; placeholder?: Record<string, unknown>; signature: { client: SignatureImageInput }; pdf?: Record<string, unknown>; fileName?: string; clientId?: string; metadata?: Record<string, unknown> };

type ContractPlaceholderDefinition = { name: string; description: string; example?: string; group: string };

const MONTH_CODE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L', 'M', 'N'];
const HOUR_CODE: Record<string, string> = { '00': 'A', '01': 'B', '02': 'C', '03': 'D', '04': 'E', '05': 'F', '06': 'G', '07': 'H', '08': 'I', '09': 'L', '10': 'M', '11': 'N', '12': 'O', '13': 'P', '14': 'Q', '15': 'R', '16': 'S', '17': 'T', '18': 'U', '19': 'V', '20': 'W', '21': 'Z', '22': 'X', '23': 'Y' };

const CONTRACT_PLACEHOLDERS: ContractPlaceholderDefinition[] = [
  ['NUMERO_CONTRATTO', 'Numero contratto generato automaticamente', 'A26G26M1234', 'Contratto'],
  ['DATA_CREAZIONE_CONTRATTO', 'Data e ora creazione contratto', '26/07/2026 10:12:34', 'Contratto'],
  ['DATA_INIZIO_CONTRATTO', 'Data inizio noleggio', '26/07/2026 10:00', 'Contratto'],
  ['DATA_FINE_CONTRATTO', 'Data fine noleggio', '29/07/2026 10:00', 'Contratto'],
  ['GIORNI_NOLEGGIO', 'Numero giorni noleggio', '3', 'Contratto'],
  ['SCONTO', 'Differenza tra totale automatico e prezzo manuale impostato', '€ 20,00', 'Contratto'],
  ['NOME_CLIENTE', 'Nome cliente', 'Mario', 'Cliente'],
  ['COGNOME_CLIENTE', 'Cognome cliente', 'Rossi', 'Cliente'],
  ['CODICE_FISCALE_CLIENTE', 'Codice fiscale cliente', 'RSSMRA...', 'Cliente'],
  ['INDIRIZZO_RESIDENZA_CLIENTE', 'Indirizzo residenza cliente', 'Via Roma 1', 'Cliente'],
  ['TELEFONO_CLIENTE', 'Telefono cliente', '+39...', 'Cliente'],
  ['EMAIL_CLIENTE', 'Email cliente', 'cliente@email.it', 'Cliente'],
  ['NUMERO_CARTA_IDENTITA_CLIENTE', 'Numero carta identità cliente', 'CA12345', 'Cliente'],
  ['LUOGO_RILASCIO_CARTA_IDENTITA_CLIENTE', 'Luogo rilascio carta identità cliente', 'Roma', 'Cliente'],
  ['DATA_RILASCIO_CARTA_IDENTITA_CLIENTE', 'Data rilascio carta identità cliente', '01/01/2024', 'Cliente'],
  ['DATA_SCADENZA_CARTA_IDENTITA_CLIENTE', 'Data scadenza carta identità cliente', '01/01/2034', 'Cliente'],
  ['NUMERO_PATENTE_CLIENTE', 'Numero patente cliente', 'U123456', 'Cliente'],
  ['LUOGO_RILASCIO_PATENTE_CLIENTE', 'Luogo rilascio patente cliente', 'Roma', 'Cliente'],
  ['DATA_RILASCIO_PATENTE_CLIENTE', 'Data rilascio patente cliente', '01/01/2020', 'Cliente'],
  ['DATA_SCADENZA_PATENTE_CLIENTE', 'Data scadenza patente cliente', '01/01/2030', 'Cliente'],
  ['NOME_CONDUCENTE_AGGIUNTIVO', 'Nome conducente aggiuntivo', 'Luigi', 'Conducente aggiuntivo'],
  ['COGNOME_CONDUCENTE_AGGIUNTIVO', 'Cognome conducente aggiuntivo', 'Bianchi', 'Conducente aggiuntivo'],
  ['CODICE_FISCALE_CONDUCENTE_AGGIUNTIVO', 'Codice fiscale conducente aggiuntivo', 'BNCLGU...', 'Conducente aggiuntivo'],
  ['RAGIONE_SOCIALE_FATTURAZIONE', 'Ragione sociale dati fatturazione', 'Mario Rossi', 'Fatturazione'],
  ['CODICE_FISCALE_FATTURAZIONE', 'Codice fiscale fatturazione', 'RSSMRA...', 'Fatturazione'],
  ['PARTITA_IVA_FATTURAZIONE', 'Partita IVA fatturazione', '12345678901', 'Fatturazione'],
  ['INDIRIZZO_SEDE_LEGALE_FATTURAZIONE', 'Indirizzo fatturazione', 'Via Roma 1', 'Fatturazione'],
  ['CODICE_UNIVOCO_FATTURAZIONE', 'Codice univoco fatturazione', 'ABC1234', 'Fatturazione'],
  ['PEC_FATTURAZIONE', 'PEC fatturazione', 'pec@pec.it', 'Fatturazione'],
  ['MARCA', 'Marca veicolo', 'Fiat', 'Veicolo'],
  ['MODELLO', 'Modello veicolo', 'Panda', 'Veicolo'],
  ['TARGA', 'Targa veicolo', 'AB123CD', 'Veicolo'],
  ['TIPO_VEICOLO', 'Tipo veicolo', 'AUTO', 'Veicolo'],
  ['ALIMENTAZIONE_VEICOLO', 'Alimentazione veicolo', 'DIESEL', 'Veicolo'],
  ['KM_ATTUALI_VEICOLO', 'Km attuali veicolo', '10.000 km', 'Veicolo'],
  ['PREZZO', 'Importo canone noleggio impostato', '€ 250,00', 'Pagamenti'],
  ['METODO_PAGAMENTO', 'Metodo pagamento canone noleggio', 'CARTA CREDITO', 'Pagamenti'],
  ['IMPORTO_CAUZIONE', 'Cauzione versata', '€ 500,00', 'Cauzione'],
  ['METODO_PAGAMENTO_CAUZIONE', 'Metodo pagamento cauzione', 'CARTA', 'Cauzione'],
  ['CODICE_PREAUTORIZZAZIONE_CAUZIONE', 'Codice preautorizzazione cauzione', 'PREAUTH123', 'Cauzione'],
  ['LIVELLO_CARBURANTE_CONSEGNA', 'Livello carburante consegna', '80%', 'Consegna'],
  ['KM_CONSEGNA', 'Km consegna', '10.200 km', 'Consegna'],
  ['KM_ECCEDENZA', 'Km eccedenza riconsegna', '50 km', 'Penali'],
  ['IMPORTO_PENALE_KM', 'Penale km eccedenza', '€ 25,00', 'Penali'],
  ['IMPORTO_PENALE_CARBURANTE', 'Penale carburante', '€ 30,00', 'Penali'],
  ['IMPORTO_PENALI', 'Totale penali addebitate', '€ 55,00', 'Penali'],
  ['METODO_PAGAMENTO_PENALI', 'Metodo pagamento penali', 'CONTANTI', 'Penali'],
  ['COPERTURA_ASSICURATIVA', 'Nome copertura assicurativa', 'Kasko', 'Copertura'],
  ['IMPORTO_COPERTURA_ASSICURATIVA', 'Importo copertura assicurativa', '€ 30,00', 'Copertura'],
  ['FRANCHIGIA_RCA', 'Franchigia RCA copertura', '€ 500,00', 'Copertura'],
  ['FRANCHIGIA_KASKO', 'Franchigia Kasko copertura', '10%', 'Copertura'],
  ['SCOPERTO_FURTO_INCENDIO', 'Scoperto furto/incendio copertura', '10%', 'Copertura'],
  ['CHILOMETRAGGIO_GIORNALIERO', 'Nome pacchetto chilometraggio', '200 km', 'Chilometraggio'],
  ['CHILOMETRAGGIO_VALORE', 'Valore numerico chilometraggio', '200', 'Chilometraggio'],
  ['IMPORTO_CHILOMETRAGGIO', 'Importo pacchetto chilometraggio', '€ 10,00', 'Chilometraggio'],
  ['SERVIZI_AGGIUNTIVI', 'Elenco servizi aggiuntivi scelti', 'Seggiolino, GPS', 'Servizi'],
  ['IMPORTO_SERVIZI_AGGIUNTIVI', 'Totale servizi aggiuntivi', '€ 20,00', 'Servizi'],
  ['COSTO_CONDUCENTE_AGGIUNTIVO', 'Costo conducente aggiuntivo', '€ 15,00', 'Servizi'],
  ['OPERATORE', 'Nome operatore', 'Mario Operatore', 'Operatore']
].map(([name, description, example, group]) => ({ name, description, example, group })) as ContractPlaceholderDefinition[];

function createTemplateCode(): string {
  return `TPL_${randomBytes(5).toString('hex').toUpperCase()}`;
}

async function generateUniqueCode(companyId: string): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = createTemplateCode();
    const existing = await prisma.contractTemplate.findUnique({ where: { companyId_code: { companyId, code } } });
    if (!existing) return code;
  }
  throw new HttpError(500, 'Impossibile generare codice template univoco');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderClientSignArea(input?: { text?: string; className?: string; style?: string }): string {
  const text = input?.text?.trim() || 'Apponi la firma';
  const className = input?.className?.trim() || 'sign-area';
  const baseStyle = 'min-height:90px;border:1px dashed #999;display:flex;align-items:center;justify-content:center;cursor:pointer;page-break-inside:avoid;';
  const style = input?.style ? `${baseStyle}${input.style}` : baseStyle;
  return `<div class="${escapeAttribute(className)}" data-signature-role="client" data-signature-placeholder="FIRMA_CLIENTE" style="${escapeAttribute(style)}">${escapeHtml(text)}</div>`;
}

function decimalNumber(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value.toNumber === 'function') return value.toNumber();
  return Number(value) || 0;
}

function formatMoney(value: any) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(decimalNumber(value));
}

function formatNumber(value: any) {
  if (value == null || value === '') return '';
  return Number(value).toLocaleString('it-IT');
}

function formatDate(value: any, withTime = false) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', ...(withTime ? { timeStyle: 'medium' } : {}) }).format(date);
}

function methodLabel(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : '';
}

function percentOrMoney(value: any, tipo?: string | null) {
  if (value == null) return '';
  return tipo === 'PERCENTUALE' ? `${formatNumber(value)}%` : formatMoney(value);
}

function rentalDays(startValue: any, endValue: any) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
}

function costValue(item: any, base: number) {
  if (!item) return 0;
  const type = item.costoTipo ?? (decimalNumber(item.costoPercentuale) > 0 ? 'PERCENTUALE' : 'IMPORTO_FISSO');
  const value = item.costo != null ? decimalNumber(item.costo) : (type === 'PERCENTUALE' ? decimalNumber(item.costoPercentuale) : decimalNumber(item.costoImportoFisso));
  return type === 'PERCENTUALE' ? base * (value / 100) : value;
}

function generateContractNumber(now = new Date()) {
  const yy = String(now.getFullYear()).slice(-2);
  const month = MONTH_CODE[now.getMonth()] ?? 'A';
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const hourLetter = HOUR_CODE[hour] ?? 'A';
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `A${yy}${month}${day}${hourLetter}${minutes}${seconds}`;
}

async function resolveBrandingDataUrls(companyId: string) {
  const [logoDocument, stampDocument] = await Promise.all([
    getBrandingDocument(companyId, 'COMPANY_LOGO'),
    getBrandingDocument(companyId, 'COMPANY_STAMP')
  ]);

  const [logoUrl, stampUrl] = await Promise.all([
    logoDocument ? readDocumentAssetBuffer(logoDocument).then((buffer) => documentAssetBufferToDataUrl(logoDocument.mimeType, buffer)) : Promise.resolve(undefined),
    stampDocument ? readDocumentAssetBuffer(stampDocument).then((buffer) => documentAssetBufferToDataUrl(stampDocument.mimeType, buffer)) : Promise.resolve(undefined)
  ]);

  return { logoUrl, stampUrl };
}

export function listAvailableContractPlaceholders() {
  return { placeholders: CONTRACT_PLACEHOLDERS };
}

export function toContractTemplateDto(template: any) {
  return {
    id: template.id,
    code: template.code,
    name: template.name,
    html: template.html,
    version: template.version,
    isActive: template.deletedAt === null,
    isDefault: template.isDefault,
    placeholders: extractPlaceholders(template.html),
    createdAt: template.createdAt,
    createdBy: template.createdBy,
    updatedAt: template.updatedAt,
    updatedBy: template.updatedBy,
    deletedAt: template.deletedAt,
    deletedBy: template.deletedBy
  };
}

export function toSignedContractDocumentDto(document: any) {
  return {
    id: document.id,
    templateCode: document.templateCode,
    templateName: document.templateName,
    templateVersion: document.templateVersion,
    bookingId: document.bookingId,
    clientId: document.clientId,
    fileName: document.fileName,
    pdfPath: document.pdfPath,
    documentAssetId: document.documentAssetId,
    metadata: document.metadata,
    createdAt: document.createdAt,
    createdBy: document.createdBy
  };
}

export async function createTemplate(companyId: string, input: CreateTemplateInput) {
  const code = await generateUniqueCode(companyId);
  return prisma.$transaction(async (tx: any) => {
    if (input.isDefault) await tx.contractTemplate.updateMany({ where: { companyId, deletedAt: null }, data: { isDefault: false, updatedBy: input.createdBy } });
    const hasAnyActive = await tx.contractTemplate.count({ where: { companyId, deletedAt: null } });
    return tx.contractTemplate.create({ data: { companyId, code, name: input.name, html: input.html, version: 1, isDefault: input.isDefault || hasAnyActive === 0, createdBy: input.createdBy, updatedBy: input.createdBy } });
  });
}

export async function listTemplates(companyId: string) {
  return prisma.contractTemplate.findMany({ where: { companyId, deletedAt: null }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
}

export async function getTemplate(companyId: string, code: string) {
  const template = await prisma.contractTemplate.findFirst({ where: { companyId, code, deletedAt: null } });
  if (!template) throw new HttpError(404, 'Template contratto non trovato');
  return template;
}

export async function updateTemplate(companyId: string, code: string, input: UpdateTemplateInput) {
  const template = await getTemplate(companyId, code);
  return prisma.contractTemplate.update({ where: { id: template.id }, data: { name: input.name, html: input.html, version: { increment: 1 }, updatedBy: input.updatedBy } });
}

export async function deleteTemplate(companyId: string, code: string, deletedBy: string) {
  const template = await getTemplate(companyId, code);
  return prisma.$transaction(async (tx: any) => {
    const deleted = await tx.contractTemplate.update({ where: { id: template.id }, data: { deletedAt: new Date(), deletedBy, updatedBy: deletedBy, isDefault: false } });
    if (template.isDefault) {
      const fallback = await tx.contractTemplate.findFirst({ where: { companyId, deletedAt: null, id: { not: template.id } }, orderBy: { createdAt: 'desc' } });
      if (fallback) await tx.contractTemplate.update({ where: { id: fallback.id }, data: { isDefault: true, updatedBy: deletedBy } });
    }
    return deleted;
  });
}

export async function setDefaultTemplate(companyId: string, code: string, updatedBy: string) {
  const template = await getTemplate(companyId, code);
  return prisma.$transaction(async (tx: any) => {
    await tx.contractTemplate.updateMany({ where: { companyId, deletedAt: null }, data: { isDefault: false, updatedBy } });
    return tx.contractTemplate.update({ where: { id: template.id }, data: { isDefault: true, updatedBy } });
  });
}

async function resolveTemplate(companyId: string, templateCode?: string) {
  if (templateCode) return getTemplate(companyId, templateCode);
  const template = await prisma.contractTemplate.findFirst({ where: { companyId, deletedAt: null, isDefault: true } });
  if (!template) throw new HttpError(404, 'Nessun template contratto predefinito configurato');
  return template;
}

async function loadBookingForPlaceholders(companyId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, companyId, deletedAt: null },
    include: {
      cliente: true,
      conducenteAggiuntivo: true,
      billingData: true,
      veicolo: true,
      operator: true,
      copertura: true,
      mileagePackage: true,
      serviziAggiuntivi: { include: { additionalService: true } }
    }
  });
  if (!booking) throw new HttpError(404, 'Prenotazione non trovata');
  return booking;
}

export async function buildContractPlaceholders(companyId: string, bookingId: string, extra: Record<string, unknown> = {}) {
  const booking: any = await loadBookingForPlaceholders(companyId, bookingId);
  const settings = await prisma.rentalSettings.findUnique({ where: { companyId } });
  const now = new Date();
  const days = rentalDays(booking.dataInizioContratto, booking.dataFineContratto);
  const dailyPrice = decimalNumber(booking.veicolo?.costoGiornaliero);
  const baseRental = days * dailyPrice;
  const coverageCost = booking.copertura ? days * costValue(booking.copertura, dailyPrice) : 0;
  const mileageCost = booking.mileagePackage ? days * costValue(booking.mileagePackage, dailyPrice) : 0;
  const services = booking.serviziAggiuntivi?.map((item: any) => item.additionalService).filter(Boolean) ?? [];
  const servicesCost = services.reduce((total: number, item: any) => total + costValue(item, baseRental), 0);
  const additionalDriverCost = booking.conducenteAggiuntivoId && settings ? costValue({ costo: settings.costoConducenteAggiuntivo, costoTipo: settings.costoConducenteAggiuntivoTipo, costoImportoFisso: settings.costoConducenteAggiuntivoImportoFisso, costoPercentuale: settings.costoConducenteAggiuntivoPercentuale }, baseRental) : 0;
  const automaticTotal = baseRental + coverageCost + mileageCost + servicesCost + additionalDriverCost;
  const discount = Math.max(0, automaticTotal - decimalNumber(booking.prezzo));
  const billing = booking.billingData;
  const client = booking.cliente;
  const driver = booking.conducenteAggiuntivo;
  const vehicle = booking.veicolo;
  const coverage = booking.copertura;
  const mileage = booking.mileagePackage;

  return {
    NUMERO_CONTRATTO: generateContractNumber(now),
    DATA_CREAZIONE_CONTRATTO: formatDate(now, true),
    PRENOTAZIONE_ID: booking.id,
    DATA_INIZIO_CONTRATTO: formatDate(booking.dataInizioContratto, true),
    DATA_FINE_CONTRATTO: formatDate(booking.dataFineContratto, true),
    GIORNI_NOLEGGIO: String(days),
    PREZZO: formatMoney(booking.prezzo),
    IMPORTO_CONTRATTO: formatMoney(booking.prezzo),
    IMPORTO_CONTRATTO_CALCOLATO: formatMoney(automaticTotal),
    SCONTO: formatMoney(discount),
    METODO_PAGAMENTO: methodLabel(booking.metodoPagamento),
    NOME_CLIENTE: client?.nome ?? '',
    COGNOME_CLIENTE: client?.cognome ?? '',
    CODICE_FISCALE_CLIENTE: client?.codiceFiscale ?? '',
    TELEFONO_CLIENTE: client?.telefono ?? '',
    EMAIL_CLIENTE: client?.email ?? '',
    INDIRIZZO_RESIDENZA_CLIENTE: client?.indirizzoResidenza ?? '',
    LUOGO_NASCITA_CLIENTE: client?.luogoNascita ?? '',
    DATA_NASCITA_CLIENTE: formatDate(client?.dataNascita),
    NUMERO_CARTA_IDENTITA_CLIENTE: client?.numeroCartaIdentita ?? '',
    LUOGO_RILASCIO_CARTA_IDENTITA_CLIENTE: client?.luogoRilascioCartaIdentita ?? '',
    DATA_RILASCIO_CARTA_IDENTITA_CLIENTE: formatDate(client?.dataRilascioCartaIdentita),
    DATA_SCADENZA_CARTA_IDENTITA_CLIENTE: formatDate(client?.dataScadenzaCartaIdentita),
    NUMERO_PATENTE_CLIENTE: client?.numeroPatente ?? '',
    LUOGO_RILASCIO_PATENTE_CLIENTE: client?.luogoRilascioPatente ?? '',
    DATA_RILASCIO_PATENTE_CLIENTE: formatDate(client?.dataRilascioPatente),
    DATA_SCADENZA_PATENTE_CLIENTE: formatDate(client?.dataScadenzaPatente),
    NOME_CONDUCENTE_AGGIUNTIVO: driver?.nome ?? '',
    COGNOME_CONDUCENTE_AGGIUNTIVO: driver?.cognome ?? '',
    CODICE_FISCALE_CONDUCENTE_AGGIUNTIVO: driver?.codiceFiscale ?? '',
    TELEFONO_CONDUCENTE_AGGIUNTIVO: driver?.telefono ?? '',
    EMAIL_CONDUCENTE_AGGIUNTIVO: driver?.email ?? '',
    NUMERO_PATENTE_CONDUCENTE_AGGIUNTIVO: driver?.numeroPatente ?? '',
    DATA_SCADENZA_PATENTE_CONDUCENTE_AGGIUNTIVO: formatDate(driver?.dataScadenzaPatente),
    RAGIONE_SOCIALE_FATTURAZIONE: billing?.ragioneSociale ?? '',
    CODICE_FISCALE_FATTURAZIONE: billing?.codiceFiscale ?? '',
    PARTITA_IVA_FATTURAZIONE: billing?.partitaIva ?? '',
    INDIRIZZO_SEDE_LEGALE_FATTURAZIONE: billing?.indirizzoSedeLegale ?? '',
    CODICE_UNIVOCO_FATTURAZIONE: billing?.codiceUnivoco ?? '',
    PEC_FATTURAZIONE: billing?.pec ?? '',
    EMAIL_FATTURAZIONE: billing?.email ?? '',
    MARCA: vehicle?.marca ?? '',
    MODELLO: vehicle?.modello ?? '',
    TARGA: vehicle?.targa ?? '',
    TIPO_VEICOLO: vehicle?.tipo ?? '',
    ALIMENTAZIONE_VEICOLO: vehicle?.alimentazione ?? '',
    KM_ATTUALI_VEICOLO: vehicle?.kmAttuali != null ? `${formatNumber(vehicle.kmAttuali)} km` : '',
    POSTI_AUTO: vehicle?.postiAuto != null ? String(vehicle.postiAuto) : '',
    IMPORTO_CAUZIONE: formatMoney(booking.importoCauzione),
    METODO_PAGAMENTO_CAUZIONE: methodLabel(booking.metodoPagamentoCauzione),
    CODICE_PREAUTORIZZAZIONE_CAUZIONE: booking.codicePreautorizzazioneCauzione ?? '',
    LIVELLO_CARBURANTE_CONSEGNA: booking.livelloCarburanteConsegna != null ? `${booking.livelloCarburanteConsegna}%` : '',
    KM_CONSEGNA: booking.kmConsegna != null ? `${formatNumber(booking.kmConsegna)} km` : '',
    LIVELLO_CARBURANTE_RICONSEGNA: booking.livelloCarburanteRiconsegna != null ? `${booking.livelloCarburanteRiconsegna}%` : '',
    KM_RICONSEGNA: booking.kmRiconsegna != null ? `${formatNumber(booking.kmRiconsegna)} km` : '',
    KM_ECCEDENZA: booking.kmEccedenza != null ? `${formatNumber(booking.kmEccedenza)} km` : '',
    IMPORTO_PENALE_KM: formatMoney(booking.importoPenaleKm),
    IMPORTO_PENALE_CARBURANTE: formatMoney(booking.importoPenaleCarburante),
    IMPORTO_PENALI: formatMoney(booking.importoPenali),
    METODO_PAGAMENTO_PENALI: methodLabel(booking.metodoPagamentoPenali),
    COPERTURA_ASSICURATIVA: coverage?.nome ?? '',
    IMPORTO_COPERTURA_ASSICURATIVA: formatMoney(coverageCost),
    FRANCHIGIA_RCA: percentOrMoney(coverage?.franchigiaRca, coverage?.franchigiaRcaTipo),
    FRANCHIGIA_KASKO: percentOrMoney(coverage?.franchigiaKasko, coverage?.franchigiaKaskoTipo),
    SCOPERTO_FURTO_INCENDIO: percentOrMoney(coverage?.scopertoFurtoIncendio ?? coverage?.franchigiaFurtoIncendio, coverage?.scopertoFurtoIncendioTipo),
    CHILOMETRAGGIO_GIORNALIERO: mileage?.nome ?? '',
    CHILOMETRAGGIO_VALORE: mileage?.chilometraggio != null ? String(mileage.chilometraggio) : '',
    IMPORTO_CHILOMETRAGGIO: formatMoney(mileageCost),
    SERVIZI_AGGIUNTIVI: services.map((item: any) => item.nome).join(', '),
    IMPORTO_SERVIZI_AGGIUNTIVI: formatMoney(servicesCost),
    COSTO_CONDUCENTE_AGGIUNTIVO: formatMoney(additionalDriverCost),
    OPERATORE: booking.operator ? [booking.operator.nome, booking.operator.cognome].filter(Boolean).join(' ') : (booking.nomeOperatore ?? ''),
    NOTE: booking.note ?? '',
    NOTE_RICONSEGNA: booking.noteRiconsegna ?? '',
    ...extra
  };
}

async function placeholdersForInput(companyId: string, input: GenerateContractInput | RenderContractHtmlInput | SaveSignedContractDocumentInput) {
  const explicit = input.placeholder ?? {};
  if (!input.bookingId) return explicit;
  const generated = await buildContractPlaceholders(companyId, input.bookingId, explicit);
  return generated;
}

export async function renderContract(companyId: string, input: GenerateContractInput) {
  const template = await resolveTemplate(companyId, input.templateCode);
  const branding = await resolveBrandingDataUrls(companyId);
  const placeholders = await placeholdersForInput(companyId, input);
  const rendered = renderHtml({
    html: template.html,
    placeholder: placeholders,
    clientSignature: input.signature?.client,
    clientSignaturePlaceholder: env.CONTRACT_CLIENT_SIGNATURE_PLACEHOLDER,
    defaultClientSignatureWidth: env.CONTRACT_DEFAULT_SIGNATURE_WIDTH,
    defaultClientSignatureHeight: env.CONTRACT_DEFAULT_SIGNATURE_HEIGHT,
    logoUrl: branding.logoUrl,
    stampUrl: branding.stampUrl,
    strictPlaceholders: true,
    sanitizeHtmlValues: true
  });
  return { ...rendered, template, placeholders };
}

export async function renderContractHtmlForSignature(companyId: string, input: RenderContractHtmlInput) {
  const template = await resolveTemplate(companyId, input.templateCode);
  const branding = await resolveBrandingDataUrls(companyId);
  const placeholders = await placeholdersForInput(companyId, input);
  const rendered = renderHtml({
    html: template.html,
    placeholder: placeholders,
    clientSignatureAreaHtml: renderClientSignArea(input.signArea?.client),
    clientSignaturePlaceholder: env.CONTRACT_CLIENT_SIGNATURE_PLACEHOLDER,
    logoUrl: branding.logoUrl,
    stampUrl: branding.stampUrl,
    strictPlaceholders: true,
    sanitizeHtmlValues: true
  });

  return { templateCode: template.code, templateName: template.name, templateVersion: template.version, html: rendered.html, placeholders, missingPlaceholders: rendered.missingPlaceholders };
}

export async function generatePdf(companyId: string, input: GenerateContractInput) {
  const rendered = await renderContract(companyId, input);
  return pdfGenerator.generate(rendered.html, input.pdf);
}

export async function saveSignedContractDocument(companyId: string, input: SaveSignedContractDocumentInput, createdBy: string) {
  const rendered = await renderContract(companyId, { bookingId: input.bookingId, templateCode: input.templateCode, placeholder: input.placeholder, signature: input.signature, pdf: input.pdf });
  const pdf = await pdfGenerator.generate(rendered.html, input.pdf);
  const fileName = input.fileName || `signed-contract-${rendered.template.code}-${Date.now()}.pdf`;
  const documentAsset = await saveDocumentAsset({
    companyId,
    type: 'SIGNED_CONTRACT',
    buffer: pdf,
    originalName: fileName,
    fileName,
    mimeType: 'application/pdf',
    bookingId: input.bookingId,
    clientId: input.clientId,
    metadata: { ...(input.metadata ?? {}), templateCode: rendered.template.code, templateVersion: rendered.template.version },
    createdBy
  });

  const contractMetadata = JSON.parse(JSON.stringify({
    ...(input.metadata ?? {}),
    documentAsset: toDocumentAssetDto(documentAsset),
    placeholders: rendered.placeholders
  })) as any;

  const document = await prisma.contractDocument.create({
    data: {
      companyId,
      templateId: rendered.template.id,
      templateCode: rendered.template.code,
      templateName: rendered.template.name,
      templateVersion: rendered.template.version,
      bookingId: input.bookingId,
      clientId: input.clientId,
      html: rendered.html,
      fileName: documentAsset.fileName,
      pdfPath: documentAsset.storagePath,
      documentAssetId: documentAsset.id,
      metadata: contractMetadata,
      createdBy,
      updatedBy: createdBy
    }
  });

  await prisma.documentAsset.update({ where: { id: documentAsset.id }, data: { contractDocumentId: document.id, updatedBy: createdBy } });
  return toSignedContractDocumentDto(document);
}
