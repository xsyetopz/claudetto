export function chunk(items, { parts, extra = "first" }) {
  if (!Number.isInteger(parts) || parts < 1) throw new RangeError("bad parts");
  if (parts > items.length) throw new RangeError("parts exceeds items");
  const base = Math.floor(items.length / parts);
  const more = items.length % parts;
  const out = [];
  let at = 0;
  for (let i = 0; i < parts; i++) {
    const big = extra === "last" ? i >= parts - more : i < more;
    const n = base + (big ? 1 : 0);
    out.push(items.slice(at, at + n));
    at += n;
  }
  return out;
}
