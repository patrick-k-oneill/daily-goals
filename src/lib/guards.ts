/**
 * Shape checks for data that arrives from outside the process — a pad file,
 * a cloud file — where nothing but the bytes vouches for it.
 */
export type Guard<T> = (value: unknown) => value is T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** A string `Date.parse` accepts: every stamp and export date is one. */
export function isTimestamp(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

export function isArrayOf<T>(guard: Guard<T>): Guard<T[]> {
  return (value): value is T[] => Array.isArray(value) && value.every(guard);
}

export function isRecordOf<T>(guard: Guard<T>): Guard<Record<string, T>> {
  return (value): value is Record<string, T> =>
    isRecord(value) && Object.values(value).every(guard);
}

export function isOptional<T>(guard: Guard<T>): Guard<T | undefined> {
  return (value): value is T | undefined => value === undefined || guard(value);
}

export function isOneOf<T extends string>(values: readonly T[]): Guard<T> {
  return (value): value is T => values.includes(value as T);
}

/** The value the text holds, or undefined when it isn't JSON at all. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
