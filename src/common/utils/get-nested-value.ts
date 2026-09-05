export function getFlattenedByPath(obj: unknown, path: string): unknown[] {
  if (!path || typeof path !== 'string') return [];
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return [];

  let cur: unknown[] = [obj];

  for (const part of parts) {
    const nxt: unknown[] = [];
    for (const item of cur) {
      if (item == null) continue;
      if (Array.isArray(item)) {
        for (const el of item) {
          if (el == null) continue;
          const v = (el as Record<string, unknown>)[part];
          if (Array.isArray(v)) {
            const arr = v as unknown[];
            nxt.push(...arr);
          } else if (v !== undefined) nxt.push(v);
        }
      } else {
        const v = (item as Record<string, unknown>)[part];
        if (Array.isArray(v)) {
          const arr = v as unknown[];
          nxt.push(...arr);
        } else if (v !== undefined) nxt.push(v);
      }
    }
    cur = nxt;
    if (cur.length === 0) break;
  }

  return cur;
}

export function matchesAttribute(
  actual: unknown[],
  expected: unknown,
): boolean {
  if (Array.isArray(expected)) {
    if (expected.length === 0) return false;
    return expected.every((e) => actual.includes(e));
  }
  return actual.includes(expected);
}

export function formatAttributeValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
