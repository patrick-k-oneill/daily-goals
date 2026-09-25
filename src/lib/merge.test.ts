import {
  canonicalJson,
  EPOCH,
  mergeKeyed,
  withoutTombstone,
  withTombstone,
  type Keyed,
  type KeyOf,
} from './merge';

interface Note {
  id: string;
  text: string;
  updatedAt: string;
}

const by: KeyOf<Note> = { key: (n) => n.id, stamp: (n) => n.updatedAt };

const T1 = '2026-08-21T08:00:00.000Z';
const T2 = '2026-08-21T09:00:00.000Z';
const T3 = '2026-08-21T10:00:00.000Z';

function note(id: string, text: string, updatedAt: string): Note {
  return { id, text, updatedAt };
}

function keyed(items: Note[], tombstones: Record<string, string> = {}): Keyed<Note> {
  return { items, tombstones };
}

describe('mergeKeyed', () => {
  it('keeps items only one side has, and the later write of items both have', () => {
    const local = keyed([note('a', 'local a', T2), note('b', 'only local', T1)]);
    const remote = keyed([note('a', 'remote a', T1), note('c', 'only remote', T1)]);
    const merged = mergeKeyed(local, remote, by);
    expect(merged.items.map((n) => [n.id, n.text])).toEqual([
      ['a', 'local a'],
      ['b', 'only local'],
      ['c', 'only remote'],
    ]);
    expect(merged.tombstones).toEqual({});
  });

  it('is the same merge whichever side is local', () => {
    const local = keyed([note('b', 'b', T1), note('a', 'a', T3)], { z: T1 });
    const remote = keyed([note('a', 'a2', T2), note('c', 'c', T1)], { b: T2 });
    expect(mergeKeyed(local, remote, by)).toEqual(mergeKeyed(remote, local, by));
    expect(mergeKeyed(local, remote, by).items.map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('is idempotent: merging the result with either side changes nothing', () => {
    const local = keyed([note('a', 'a', T1)], { b: T2 });
    const remote = keyed([note('b', 'b', T1), note('c', 'c', T3)]);
    const merged = mergeKeyed(local, remote, by);
    expect(mergeKeyed(merged, remote, by)).toEqual(merged);
    expect(mergeKeyed(local, merged, by)).toEqual(merged);
  });

  it('removes an item whose tombstone is at or after its stamp, and keeps the tombstone', () => {
    const merged = mergeKeyed(
      keyed([note('a', 'edited before removal', T1), note('b', 'same moment', T2)]),
      keyed([], { a: T2, b: T2 }),
      by,
    );
    expect(merged.items).toEqual([]);
    expect(merged.tombstones).toEqual({ a: T2, b: T2 });
  });

  it('revives an item written after its tombstone and spends the tombstone', () => {
    const merged = mergeKeyed(keyed([note('a', 'rewritten', T3)]), keyed([], { a: T2 }), by);
    expect(merged.items).toEqual([note('a', 'rewritten', T3)]);
    expect(merged.tombstones).toEqual({});
  });

  it('keeps the later of two tombstones for the same key', () => {
    const merged = mergeKeyed(keyed([], { a: T1 }), keyed([], { a: T3 }), by);
    expect(merged.tombstones).toEqual({ a: T3 });
  });

  it('breaks a tie between equal stamps the same way on every device', () => {
    const local = keyed([note('a', 'apple', EPOCH)]);
    const remote = keyed([note('a', 'banana', EPOCH)]);
    const fromLocal = mergeKeyed(local, remote, by);
    const fromRemote = mergeKeyed(remote, local, by);
    expect(fromLocal).toEqual(fromRemote);
    expect(fromLocal.items[0].text).toBe('banana');
  });

  it('never drops an item that has no tombstone', () => {
    const local = keyed([note('a', 'a', EPOCH), note('b', 'b', T1)]);
    const remote = keyed([note('c', 'c', EPOCH), note('a', 'a', T2)]);
    const merged = mergeKeyed(local, remote, by);
    expect(merged.items.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('compares stamps as moments, not strings', () => {
    const merged = mergeKeyed(
      keyed([note('a', 'no millis', '2026-08-21T09:00:00Z')]),
      keyed([note('a', 'millis', '2026-08-21T09:00:00.500Z')]),
      by,
    );
    expect(merged.items[0].text).toBe('millis');
  });
});

describe('tombstones', () => {
  it('are written on removal and spent on rewrite', () => {
    const removed = withTombstone({}, 'a', T1);
    expect(removed).toEqual({ a: T1 });
    expect(withoutTombstone(removed, 'a')).toEqual({});
    expect(withoutTombstone(removed, 'missing')).toEqual({ a: T1 });
  });
});

describe('canonicalJson', () => {
  it('sorts keys at every level so equal content serializes equally', () => {
    const a = { z: 1, a: { y: [{ q: 1, p: 2 }], x: 2 } };
    const b = { a: { x: 2, y: [{ p: 2, q: 1 }] }, z: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"a":{"x":2,"y":[{"p":2,"q":1}]},"z":1}');
  });
});
