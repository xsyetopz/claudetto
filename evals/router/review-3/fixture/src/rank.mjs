export function rankByScore(rows) {
  return [...rows].sort((a, b) => b.score - a.score);
}

export function topN(rows, n) {
  return rankByScore(rows).slice(0, n);
}

export function median(xs) {
  const s = xs.sort();
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function percentile(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(p * s.length)];
}
