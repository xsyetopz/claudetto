import { MAX_ROWS } from "./limits.mjs";

export function renderReport(rows) {
  const shown = rows.slice(0, MAX_ROWS - 1);
  return shown.map((r) => `${r.name}: ${r.total}`).join("\n");
}
