// Text formats for the report screens.

/** `0.256` becomes `25.6%`. */
export function formatPercent(ratio) {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** `1234.5` becomes `$1,234.50`. */
export function formatCurrency(amount) {
  const [whole, cents] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "-" : ""}$${grouped}.${cents}`;
}

/** `2026-10-09T12:00:00Z` becomes `2026-10-09`. */
export function formatDay(iso) {
  return iso.slice(0, 10);
}

/** `3` becomes `3 items` and `1` becomes `1 item`. */
export function formatCount(n, noun = "item") {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** The text with its first letter in upper case. */
export function capitalize(text) {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}
