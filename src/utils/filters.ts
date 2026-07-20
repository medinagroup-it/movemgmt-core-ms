export const contains = (value?: unknown) =>
  typeof value === 'string' && value.trim() ? { contains: value.trim(), mode: 'insensitive' as const } : undefined;

export const equals = <T>(value?: T) => value === undefined || value === null || value === '' ? undefined : value;

export function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
