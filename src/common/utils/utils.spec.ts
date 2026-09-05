import {
  getFlattenedByPath,
  matchesAttribute,
  formatAttributeValue,
} from './get-nested-value';

describe('getFlattenedByPath', () => {
  it('should return [] for empty or non-string path', () => {
    expect(getFlattenedByPath({ a: 1 }, '')).toEqual([]);
    expect(getFlattenedByPath({ a: 1 }, null as unknown as string)).toEqual([]);
    expect(
      getFlattenedByPath({ a: 1 }, undefined as unknown as string),
    ).toEqual([]);
    expect(getFlattenedByPath({ a: 1 }, 123 as unknown as string)).toEqual([]);
  });

  it('should return [] for path with only dots', () => {
    expect(getFlattenedByPath({ a: 1 }, '.')).toEqual([]);
    expect(getFlattenedByPath({ a: 1 }, '..')).toEqual([]);
    expect(getFlattenedByPath({ a: 1 }, '...')).toEqual([]);
  });

  it('should filter empty segments from malformed paths', () => {
    expect(getFlattenedByPath({ a: { b: 2 } }, 'a..b')).toEqual([2]);
    expect(getFlattenedByPath({ a: { b: 2 } }, '.a.b')).toEqual([2]);
    expect(getFlattenedByPath({ a: { b: 2 } }, 'a.b.')).toEqual([2]);
    expect(getFlattenedByPath({ a: { b: 2 } }, '.a..b.')).toEqual([2]);
  });

  it('should resolve top-level attribute', () => {
    expect(getFlattenedByPath({ role: 'admin' }, 'role')).toEqual(['admin']);
  });

  it('should resolve nested dot-path', () => {
    expect(
      getFlattenedByPath(
        { organization: { plan: 'pro' } },
        'organization.plan',
      ),
    ).toEqual(['pro']);
  });

  it('should resolve deeply nested path', () => {
    expect(
      getFlattenedByPath({ a: { b: { c: { d: 42 } } } }, 'a.b.c.d'),
    ).toEqual([42]);
  });

  it('should return [] for missing intermediate', () => {
    expect(getFlattenedByPath({}, 'organization.plan')).toEqual([]);
    expect(
      getFlattenedByPath({ organization: null }, 'organization.plan'),
    ).toEqual([]);
    expect(
      getFlattenedByPath({ organization: undefined }, 'organization.plan'),
    ).toEqual([]);
  });

  it('should return [] for non-existent leaf', () => {
    expect(getFlattenedByPath({ a: { b: 1 } }, 'a.c')).toEqual([]);
    expect(getFlattenedByPath({ a: 1 }, 'a.b.c')).toEqual([]);
  });

  it('should handle array at intermediate and flatten', () => {
    const user = { orgs: [{ role: 'viewer' }, { role: 'admin' }] };
    expect(getFlattenedByPath(user, 'orgs.role')).toEqual(['viewer', 'admin']);
  });

  it('should handle array at leaf and flatten', () => {
    expect(getFlattenedByPath({ roles: ['admin', 'editor'] }, 'roles')).toEqual(
      ['admin', 'editor'],
    );
  });

  it('should handle nested array with dot-path: a.b where a is array', () => {
    const obj = { a: [{ b: 1 }, { b: 2 }, { b: 3 }] };
    expect(getFlattenedByPath(obj, 'a.b')).toEqual([1, 2, 3]);
  });

  it('should handle double nested arrays: a.b.c', () => {
    const objSimple = { a: [{ b: { c: 'x' } }, { b: { c: 'y' } }] };
    expect(getFlattenedByPath(objSimple, 'a.b.c')).toEqual(['x', 'y']);
  });

  it('should handle array inside array value: org.permissions where permissions is array', () => {
    const user = {
      orgs: [{ permissions: ['read', 'write'] }, { permissions: ['delete'] }],
    };
    expect(getFlattenedByPath(user, 'orgs.permissions')).toEqual([
      'read',
      'write',
      'delete',
    ]);
  });

  it('should handle mixed: single object and array intermixed', () => {
    const obj = { a: { b: [{ c: 1 }, { c: 2 }] } };
    expect(getFlattenedByPath(obj, 'a.b.c')).toEqual([1, 2]);
  });

  it('should skip null/undefined elements in intermediate arrays', () => {
    const obj = {
      orgs: [{ role: 'admin' }, null, undefined, { role: 'viewer' }],
    };
    expect(getFlattenedByPath(obj, 'orgs.role')).toEqual(['admin', 'viewer']);
  });

  it('should skip null element inside value array', () => {
    const obj = { a: [null, { b: 1 }, undefined, { b: 2 }] };
    expect(getFlattenedByPath(obj, 'a.b')).toEqual([1, 2]);
  });

  it('should handle null/undefined root object', () => {
    expect(getFlattenedByPath(null, 'a.b')).toEqual([]);
    expect(getFlattenedByPath(undefined, 'a.b')).toEqual([]);
  });

  it('should handle primitive root object', () => {
    expect(getFlattenedByPath(42, 'a')).toEqual([]);
    expect(getFlattenedByPath('str', 'a')).toEqual([]);
  });

  it('should break early when cur becomes empty', () => {
    expect(getFlattenedByPath({ a: { b: 1 } }, 'a.c.d.e')).toEqual([]);
  });

  it('should not include undefined values', () => {
    const obj = { a: [{ b: undefined }, { b: 1 }] };
    expect(getFlattenedByPath(obj, 'a.b')).toEqual([1]);
  });

  it('should include null values when directly at leaf? (null is value, not missing)', () => {
    const obj = { a: { b: null } };
    expect(getFlattenedByPath(obj, 'a.b')).toEqual([null]);
  });

  it('should handle path with numeric keys (array-like object)', () => {
    const obj = { a: { '0': 'zero' } };
    expect(getFlattenedByPath(obj, 'a.0')).toEqual(['zero']);
  });

  it('should handle root being an array (covers array-item branch)', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(getFlattenedByPath(arr as unknown as object, 'a')).toEqual([
      1, 2, 3,
    ]);
  });

  it('should handle root array with null/undefined elements', () => {
    const arr = [{ a: 1 }, null, undefined, { a: 2 }];
    expect(getFlattenedByPath(arr as unknown as object, 'a')).toEqual([1, 2]);
  });

  it('should handle root array where value is array to flatten', () => {
    const arr = [{ tags: ['x', 'y'] }, { tags: ['z'] }];
    expect(getFlattenedByPath(arr as unknown as object, 'tags')).toEqual([
      'x',
      'y',
      'z',
    ]);
  });

  it('should handle array-item branch for nested b.c on root array', () => {
    const obj = [{ b: { c: 10 } }, { b: { c: 20 } }];
    expect(getFlattenedByPath(obj as unknown as object, 'b.c')).toEqual([
      10, 20,
    ]);
  });

  it('should handle array-item with missing property (covers else-if false)', () => {
    const arr = [{ a: 1 }, { b: 2 }, { a: 3 }];
    expect(getFlattenedByPath(arr as unknown as object, 'a')).toEqual([1, 3]);
  });

  it('should handle array-item where value is undefined skips', () => {
    const arr = [{ a: undefined }, { a: 1 }];
    expect(getFlattenedByPath(arr as unknown as object, 'a')).toEqual([1]);
  });
});

describe('matchesAttribute', () => {
  it('should match scalar expected via includes', () => {
    expect(matchesAttribute(['admin', 'editor'], 'admin')).toBe(true);
    expect(matchesAttribute(['admin', 'editor'], 'viewer')).toBe(false);
  });

  it('should return false for empty actual with scalar expected', () => {
    expect(matchesAttribute([], 'admin')).toBe(false);
  });

  it('should handle EVERY semantics for array expected', () => {
    expect(
      matchesAttribute(['read', 'write', 'delete'], ['read', 'write']),
    ).toBe(true);
    expect(matchesAttribute(['read'], ['read', 'write'])).toBe(false);
    expect(matchesAttribute(['read', 'write'], ['read', 'write'])).toBe(true);
  });

  it('should return false for empty expected array', () => {
    expect(matchesAttribute(['a'], [])).toBe(false);
    expect(matchesAttribute([], [])).toBe(false);
  });

  it('should handle single-element array expected', () => {
    expect(matchesAttribute(['a', 'b'], ['a'])).toBe(true);
    expect(matchesAttribute(['b'], ['a'])).toBe(false);
  });

  it('should use strict equality (===) via includes', () => {
    expect(matchesAttribute([1, 2, 3], 1)).toBe(true);
    expect(matchesAttribute([1, 2, 3], '1')).toBe(false);
    expect(matchesAttribute([0], 0)).toBe(true);
    expect(matchesAttribute([0], false)).toBe(false);
  });

  it('should match null and 0 correctly', () => {
    expect(matchesAttribute([null, 'a'], null)).toBe(true);
    expect(matchesAttribute([0], 0)).toBe(true);
    expect(matchesAttribute([null], 'null')).toBe(false);
  });

  it('should return false when actual is empty and expected is array', () => {
    expect(matchesAttribute([], ['admin'])).toBe(false);
  });
});

describe('formatAttributeValue', () => {
  it('should JSON.stringify values', () => {
    expect(formatAttributeValue('admin')).toBe('"admin"');
    expect(formatAttributeValue(['a', 'b'])).toBe('["a","b"]');
    expect(formatAttributeValue({ a: 1 })).toBe('{"a":1}');
    expect(formatAttributeValue(42)).toBe('42');
    expect(formatAttributeValue(null)).toBe('null');
    expect(formatAttributeValue(undefined)).toBeUndefined();
  });

  it('should handle undefined as String fallback when needed', () => {
    expect(formatAttributeValue(undefined)).toBeUndefined();
  });

  it('should fallback to String for circular references', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = formatAttributeValue(circular);
    expect(typeof result).toBe('string');
    expect(result).toBe('[object Object]');
  });

  it('should handle symbols and functions gracefully', () => {
    expect(() => formatAttributeValue(Symbol('s'))).not.toThrow();
    expect(() => formatAttributeValue(() => {})).not.toThrow();
  });
});
