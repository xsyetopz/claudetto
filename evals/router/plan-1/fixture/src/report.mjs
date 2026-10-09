import { row } from "./format.mjs";

export function report(rows, opts = {}) {
  const lines = rows.map((r) => row([r.name, r.total]));
  if (opts.verbose) lines.push(`${rows.length} rows`);
  return lines.join("\n");
}
