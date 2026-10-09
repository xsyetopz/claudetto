export async function mapAsync(items, fn) {
  const out = [];
  items.forEach(async (x, i) => {
    out[i] = await fn(x);
  });
  return out;
}
