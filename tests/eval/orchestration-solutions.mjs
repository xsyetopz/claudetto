// Correct solutions of the router `orchestration-*` cases, as a map from file to text.
// A test takes one file out or swaps it for a careless version.

export const SOLUTIONS_1 = {
  "src/pad.mjs": `export function padLeft(s, n, ch = " ") {
  if (ch.length !== 1) throw new RangeError("ch must be one character");
  return s.length >= n ? s : ch.repeat(n - s.length) + s;
}
`,
  "src/clamp.mjs": `export function clamp(x, lo, hi) {
  if (lo > hi) throw new RangeError("lo is more than hi");
  if (Number.isNaN(x)) throw new TypeError("x is NaN");
  return Math.min(Math.max(x, lo), hi);
}
`,
  "src/uniq.mjs": `export function uniq(xs, keyFn = (x) => x) {
  const seen = new Set();
  return xs.filter((x) => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
`,
  "src/chunk.mjs": `export function chunk(xs, n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("bad n");
  const out = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}
`,
  "src/median.mjs": `export function median(xs) {
  if (xs.length === 0) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
`,
  "src/camel.mjs": `export function camelCase(s) {
  return s
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w, i) => (i ? w[0].toUpperCase() : w[0].toLowerCase()) + w.slice(1))
    .join("");
}
`,
  "src/semver.mjs": `function split(v) {
  const at = v.indexOf("-");
  const core = at < 0 ? v : v.slice(0, at);
  const parts = core.split(".").map((p) => {
    if (!/^\\d+$/.test(p)) throw new TypeError("bad part");
    return Number(p);
  });
  return [parts, at < 0 ? null : v.slice(at + 1)];
}

export function compareVersions(a, b) {
  const [pa, ra] = split(a);
  const [pb, rb] = split(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return Math.sign(d);
  }
  if (ra === rb) return 0;
  if (ra === null) return 1;
  if (rb === null) return -1;
  return ra < rb ? -1 : 1;
}
`,
  "src/query.mjs": `const dec = (t) => decodeURIComponent(t.replaceAll("+", " "));

export function parseQuery(s) {
  const out = {};
  const text = s.startsWith("?") ? s.slice(1) : s;
  if (!text) return out;
  for (const pair of text.split("&")) {
    const at = pair.indexOf("=");
    const k = dec(at < 0 ? pair : pair.slice(0, at));
    const v = at < 0 ? "" : dec(pair.slice(at + 1));
    if (!Object.hasOwn(out, k)) out[k] = v;
    else if (Array.isArray(out[k])) out[k].push(v);
    else out[k] = [out[k], v];
  }
  return out;
}
`,
  "src/wrap.mjs": `export function wrap(text, width) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/ +/).filter(Boolean)) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += \` \${w}\`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.join("\\n");
}
`,
  "src/dedent.mjs": `export function dedent(s) {
  const lines = s.split("\\n");
  const lead = lines
    .filter((l) => l.trim() !== "")
    .map((l) => /^ */.exec(l)[0].length);
  const min = lead.length ? Math.min(...lead) : 0;
  return lines.map((l) => (l.trim() === "" ? "" : l.slice(min))).join("\\n");
}
`,
};

export const SOLUTIONS_2 = {
  "src/last.mjs": `export function last(xs, n) {
  if (n === undefined) return xs[xs.length - 1];
  return n === 0 ? [] : xs.slice(-n);
}
`,
  "src/cap.mjs": `export const capitalizeAll = (s) =>
  s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
`,
  "src/zip.mjs": `export const zip = (a, b) =>
  Array.from({ length: Math.min(a.length, b.length) }, (_, i) => [a[i], b[i]]);
`,
  "src/count.mjs": `export function countBy(xs) {
  const m = new Map();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}
`,
  "src/flatten.mjs": `export const flatten = (xs, depth = 1) => xs.flat(depth);
`,
  "src/palin.mjs": `export function isPalindrome(s) {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return t === [...t].reverse().join("");
}
`,
  "src/pairs.mjs": `export function fromPairs(pairs) {
  const out = {};
  for (const p of pairs) {
    if (!Array.isArray(p) || p.length !== 2) throw new TypeError("bad pair");
    out[p[0]] = p[1];
  }
  return out;
}
`,
  "src/roman.mjs": `const TABLE = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function roman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999) throw new RangeError("bad n");
  let out = "";
  for (const [v, s] of TABLE) while (n >= v) ((out += s), (n -= v));
  return out;
}
`,
  "src/group.mjs": `export function groupBy(xs, keyFn) {
  const m = new Map();
  xs.forEach((x, i) => {
    const k = keyFn(x, i);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  });
  return m;
}
`,
  "src/duration.mjs": `export function formatDuration(ms) {
  if (!Number.isInteger(ms) || ms < 0) throw new RangeError("bad ms");
  const s = Math.floor(ms / 1000);
  const parts = [
    [Math.floor(s / 3600), "h"],
    [Math.floor((s % 3600) / 60), "m"],
    [s % 60, "s"],
  ];
  const text = parts.filter(([n]) => n).map(([n, u]) => n + u);
  return text.length ? text.join(" ") : "0s";
}
`,
  "src/bits.mjs": `export function popcount(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError("bad n");
  return [...n.toString(2)].filter((c) => c === "1").length;
}
`,
  "src/ranges.mjs": `export function mergeRanges(rs) {
  const out = [];
  for (const r of rs.map((x) => [...x]).sort((a, b) => a[0] - b[0])) {
    const prev = out[out.length - 1];
    if (prev && r[0] <= prev[1]) prev[1] = Math.max(prev[1], r[1]);
    else out.push(r);
  }
  return out;
}
`,
};

export const SOLUTIONS_3 = {
  "src/even.mjs": `export function isEven(n) {
  if (!Number.isInteger(n)) throw new TypeError("n is not an integer");
  return n % 2 === 0;
}
`,
  "src/words.mjs": `export const words = (s) => s.split(/ +/).filter(Boolean);
`,
  "src/range.mjs": `export function range(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b))
    throw new RangeError("not an integer");
  return Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
}
`,
  "src/bytes.mjs": `export function formatBytes(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("bad n");
  if (n < 1024) return \`\${n} B\`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) (v /= 1024, i++);
  return \`\${v.toFixed(1).replace(/\\.0$/, "")} \${units[i]}\`;
}
`,
  "src/transpose.mjs": `export function transpose(rows) {
  if (rows.length === 0) return [];
  const n = rows[0].length;
  if (rows.some((r) => r.length !== n)) throw new RangeError("ragged rows");
  return Array.from({ length: n }, (_, c) => rows.map((r) => r[c]));
}
`,
  "src/pick.mjs": `export function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (Object.hasOwn(obj, k)) out[k] = obj[k];
  return out;
}
`,
  "src/leap.mjs": `export function isLeapYear(y) {
  if (!Number.isInteger(y)) throw new TypeError("y is not an integer");
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}
`,
};
