export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const sum = new Uint8Array(a.length + b.length);
  sum.set(a, 0);
  sum.set(b, a.length);
  return sum;
}
