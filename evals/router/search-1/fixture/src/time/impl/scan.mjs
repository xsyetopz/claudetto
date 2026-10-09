const UNITS = { h: 3600000, m: 60000, s: 1000 };

export function scan(text) {
  const parts = text.match(/^(?:\d+[hms])+$/);
  if (!parts) throw new Error(`bad duration: ${text}`);
  let total = 0;
  for (const [, n, u] of text.matchAll(/(\d+)([hms])/g)) total += n * UNITS[u];
  return total;
}
