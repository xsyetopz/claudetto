export function slug(text, opts = {}) {
  let t = text.toLowerCase();
  if (opts.ascii) t = t.normalize("NFD").replace(/\p{M}/gu, "");
  t = t.replace(opts.strip ?? /[^a-z0-9\s]/g, "");
  const joiner = opts.joiner ?? "_";
  let out = "";
  for (const w of t.split(/\s+/).filter(Boolean)) {
    const next = out ? out + joiner + w : w;
    if (opts.limit && next.length > opts.limit) break;
    out = next;
  }
  return out;
}
