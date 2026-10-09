export function title(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
