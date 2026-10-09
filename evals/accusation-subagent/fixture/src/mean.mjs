export function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
