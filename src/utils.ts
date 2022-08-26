export function groupBy<K extends PropertyKey, T, Y = T>(
  list: T[],
  fn: (x: T) => K,
  valueFn?: (x: T) => Y
): Record<K, Y[]> {
  const result = {} as Record<K, Y[]>;
  list.forEach((o) => {
    const group = fn(o);
    result[group] ??= [];
    result[group].push(valueFn ? valueFn(o) : (o as any as Y));
  });
  return result;
}

export function last<T>(list: T[]): T | undefined {
  return list[list.length - 1];
}
