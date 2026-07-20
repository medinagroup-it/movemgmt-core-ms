import { HttpError } from './httpError';

export function routeParam(value: string | string[] | undefined, name: string): string {
  if (!value || Array.isArray(value)) throw new HttpError(400, `Parametro route non valido: ${name}`);
  return value;
}
