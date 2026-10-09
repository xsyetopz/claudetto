export const pad = (s, n) => String(s).padEnd(n);
export const row = (cols) => cols.map((c) => pad(c, 8)).join("|");
