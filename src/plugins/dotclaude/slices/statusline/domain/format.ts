// The number formats of the status line.

/** Tokens as thousands, such as `45k`. */
export const thousands = (n: number): string => `${Math.round(n / 1000)}k`;

/** Dollars with cents, such as `$1.23`. */
export const dollars = (n: number): string => `$${n.toFixed(2)}`;

/** A span in milliseconds as `45s`, `12m`, `3h12m`, or `2d4h`. A span of zero or less gives `0s`. */
export const span = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${String(minutes % 60).padStart(2, "0")}m`;
  return `${Math.floor(hours / 24)}d${hours % 24}h`;
};

/** The last part of a folder path, for either separator. */
export const baseName = (dir: string): string => {
  const parts = dir.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? dir;
};
