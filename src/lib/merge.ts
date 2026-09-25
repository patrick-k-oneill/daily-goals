/**
 * The vocabulary two copies of the pad are reconciled with (ADR 0005). Every
 * item carries a stamp, the ISO moment it was last written; a removed item
 * leaves a tombstone, its key and when. Merging is per item: the later stamp
 * wins, and a tombstone at or after an item's stamp removes it.
 */

export type Stamp = string;

/** The beginning of time: the stamp of an item nobody has written on yet. */
export const EPOCH: Stamp = '1970-01-01T00:00:00.000Z';

/** Removed items by key, each with when it was removed. */
export type Tombstones = Record<string, Stamp>;

export interface Keyed<T> {
  items: T[];
  tombstones: Tombstones;
}

export interface KeyOf<T> {
  key: (item: T) => string;
  stamp: (item: T) => Stamp;
}

/**
 * Merge two copies of a keyed collection. Per key the later stamp wins, ties
 * going to a canonical comparison of the content so every device picks the
 * same copy; a tombstone at or after an item's stamp removes it, and an item
 * written after its tombstone revives and spends it. The result is canonical:
 * sorted by key, so a merge is the same whichever side is local.
 */
export function mergeKeyed<T>(local: Keyed<T>, remote: Keyed<T>, by: KeyOf<T>): Keyed<T> {
  const tombstones = new Map<string, Stamp>();
  for (const [key, at] of [
    ...Object.entries(local.tombstones),
    ...Object.entries(remote.tombstones),
  ]) {
    const known = tombstones.get(key);
    if (known === undefined || isAfter(at, known)) tombstones.set(key, at);
  }

  const candidates = new Map<string, T>();
  for (const item of [...local.items, ...remote.items]) {
    const key = by.key(item);
    const rival = candidates.get(key);
    candidates.set(key, rival === undefined ? item : later(rival, item, by));
  }

  const items: T[] = [];
  for (const [key, item] of candidates) {
    const removedAt = tombstones.get(key);
    if (removedAt !== undefined && !isAfter(by.stamp(item), removedAt)) continue;
    tombstones.delete(key);
    items.push(item);
  }

  items.sort((a, b) => compareKeys(by.key(a), by.key(b)));
  const sortedTombstones = [...tombstones].sort(([a], [b]) => compareKeys(a, b));
  return { items, tombstones: Object.fromEntries(sortedTombstones) };
}

export function withTombstone(tombstones: Tombstones, key: string, at: Stamp): Tombstones {
  return { ...tombstones, [key]: at };
}

export function withoutTombstone(tombstones: Tombstones, key: string): Tombstones {
  const { [key]: _spent, ...rest } = tombstones;
  return rest;
}

/** JSON with object keys sorted at every level, so equal content serializes equally. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    isPlainObject(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
}

function later<T>(a: T, b: T, by: KeyOf<T>): T {
  const stampA = by.stamp(a);
  const stampB = by.stamp(b);
  if (stampA !== stampB) return isAfter(stampA, stampB) ? a : b;
  return canonicalJson(a) > canonicalJson(b) ? a : b;
}

function isAfter(a: Stamp, b: Stamp): boolean {
  return Date.parse(a) > Date.parse(b);
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
