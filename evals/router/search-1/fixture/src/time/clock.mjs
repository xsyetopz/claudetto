// Parses a clock text such as `12:30`.
// A duration such as `1h30m` goes to `parseDuration`.
export function parseClock(text) {
  const [h, m] = text.split(":").map(Number);
  return h * 60 + m;
}
