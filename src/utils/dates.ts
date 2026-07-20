import { HttpError } from './httpError';

export function ensureValidRange(start: Date, end: Date): void {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new HttpError(400, 'Date non valide');
  if (start >= end) throw new HttpError(400, 'dataInizioContratto deve essere precedente a dataFineContratto');
}
