import { describe, expect, it } from 'vitest';
import { mergeImported } from './merge-imported.js';
import { stampNamespace } from './timestamps.js';
import { at, entry, namespace } from './testing/helpers.js';

describe('stampNamespace', () => {
  it('GIVEN a new namespace WHEN stamped THEN it and its entries get the current time', () => {
    const stamped = stampNamespace(undefined, namespace('n', [entry('a')]), at(5));

    expect(stamped.createdAt).toEqual(at(5));
    expect(stamped.modifiedAt).toEqual(at(5));
    expect(stamped.getEntry('a').createdAt).toEqual(at(5));
    expect(stamped.getEntry('a').modifiedAt).toEqual(at(5));
  });

  it('GIVEN a new namespace that already carries a creation time WHEN stamped THEN it is kept', () => {
    const stamped = stampNamespace(undefined, namespace('n', [], { createdAt: at(1) }), at(5));

    expect(stamped.createdAt).toEqual(at(1));
    expect(stamped.modifiedAt).toEqual(at(5));
  });

  it('GIVEN identical content WHEN stamped again THEN every timestamp is unchanged', () => {
    const first = stampNamespace(undefined, namespace('n', [entry('a')]), at(1));
    const second = stampNamespace(first, namespace('n', [entry('a')]), at(9));

    expect(second.createdAt).toEqual(at(1));
    expect(second.modifiedAt).toEqual(at(1));
    expect(second.getEntry('a').modifiedAt).toEqual(at(1));
  });

  it('GIVEN an unchanged namespace without stored timestamps WHEN stamped THEN now is used', () => {
    const stamped = stampNamespace(namespace('n'), namespace('n'), at(4));

    expect(stamped.modifiedAt).toEqual(at(4));
    expect(stamped.createdAt).toEqual(at(4));
  });

  it('GIVEN a changed entry value WHEN stamped THEN entry and namespace modification move, creation stays', () => {
    const first = stampNamespace(undefined, namespace('n', [entry('a'), entry('b')]), at(1));
    const second = stampNamespace(first, first.updateEntry('a', { value: 'new' }), at(7));

    expect(second.getEntry('a').createdAt).toEqual(at(1));
    expect(second.getEntry('a').modifiedAt).toEqual(at(7));
    expect(second.getEntry('b').modifiedAt).toEqual(at(1));
    expect(second.modifiedAt).toEqual(at(7));
    expect(second.createdAt).toEqual(at(1));
  });

  it.each([
    ['a description change', (n: ReturnType<typeof namespace>) => n.update({ description: 'new' })],
    ['a new entry', (n: ReturnType<typeof namespace>) => n.addEntry(entry('b'))],
    ['a removed entry', (n: ReturnType<typeof namespace>) => n.removeEntry('a')],
    ['a renamed entry', (n: ReturnType<typeof namespace>) => n.updateEntry('a', { name: 'z' })],
    ['a namespace rename', (n: ReturnType<typeof namespace>) => n.update({ name: 'renamed' })],
    [
      'a metadata-only change',
      (n: ReturnType<typeof namespace>) => n.updateEntry('a', { envDependent: true }),
    ],
  ])('GIVEN %s WHEN stamped THEN the namespace modification time moves', (_label, change) => {
    const first = stampNamespace(undefined, namespace('n', [entry('a')]), at(1));

    expect(stampNamespace(first, change(first), at(6)).modifiedAt).toEqual(at(6));
  });

  it('GIVEN an entry rename WHEN stamped THEN the entry keeps its creation time', () => {
    const first = stampNamespace(undefined, namespace('n', [entry('a')]), at(1));
    const second = stampNamespace(first, first.updateEntry('a', { name: 'z' }), at(6));

    expect(second.getEntry('z').createdAt).toEqual(at(1));
    expect(second.getEntry('z').modifiedAt).toEqual(at(6));
  });
});

describe('mergeImported', () => {
  const stored = namespace('n', [entry('old')], {
    description: 'kept',
    createdAt: at(1),
    modifiedAt: at(2),
  });

  it('GIVEN no existing namespace WHEN merged THEN the incoming one is used as is', () => {
    const incoming = namespace('n', [entry('new')]);

    expect(mergeImported(undefined, incoming)).toBe(incoming);
  });

  it('GIVEN an existing namespace WHEN merged THEN entries are replaced and identity kept', () => {
    const merged = mergeImported(stored, namespace('n', [entry('new')], { description: 'fresh' }));

    expect(merged.entries.map((e) => e.name)).toEqual(['new']);
    expect(merged.description).toBe('fresh');
    expect(merged.createdAt).toEqual(at(1));
    expect(merged.modifiedAt).toEqual(at(2));
  });

  it('GIVEN an import without a description WHEN merged THEN the stored description is kept', () => {
    expect(mergeImported(stored, namespace('n')).description).toBe('kept');
  });

  it('GIVEN neither side has a description WHEN merged THEN there is none', () => {
    expect(mergeImported(namespace('n'), namespace('n')).description).toBeUndefined();
  });
});
