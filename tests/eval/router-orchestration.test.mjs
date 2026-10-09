// Fixture runs of the router `orchestration-*` cases (task 11.12).
// Each task has an edge in `TASKS.md` that a quick version skips,
// so a run that does the plain version of one task is not resolved.

import { expect, test } from "bun:test";
import {
  SOLUTIONS_1,
  SOLUTIONS_2,
  SOLUTIONS_3,
} from "./orchestration-solutions.mjs";
import { resolves, writes } from "./router-case.mjs";

/** The careless version of one file of each case: what a quick run writes. */
const CARELESS_1 = {
  "src/semver.mjs": `export const compareVersions = (a, b) => (a < b ? -1 : a > b ? 1 : 0);\n`,
  "src/query.mjs": `export function parseQuery(s) {
  return Object.fromEntries(new URLSearchParams(s));
}\n`,
  "src/wrap.mjs": `export function wrap(text, width) {
  return (text.match(new RegExp(\`.{1,\${width}}\`, "g")) ?? []).join("\\n");
}\n`,
  "src/dedent.mjs": `export const dedent = (s) =>
  s.split("\\n").map((l) => l.trimStart()).join("\\n");\n`,
  "src/uniq.mjs": `export const uniq = (xs, keyFn = (x) => x) => {
  const seen = [];
  return xs.filter((x) => {
    const k = keyFn(x);
    if (seen.includes(k) && k === k) return false;
    seen.push(k);
    return true;
  });
};\n`,
  "src/median.mjs": `export function median(xs) {
  if (xs.length === 0) return undefined;
  xs.sort((a, b) => a - b);
  const mid = xs.length >> 1;
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}\n`,
};

const CARELESS_2 = {
  "src/bits.mjs": `export function popcount(n) {
  if (n < 0 || !Number.isInteger(n)) throw new RangeError("bad n");
  let c = 0;
  while (n) {
    c += n & 1;
    n >>>= 1;
  }
  return c;
}\n`,
  "src/ranges.mjs": `export function mergeRanges(rs) {
  const out = [];
  for (const r of [...rs].sort((a, b) => a[0] - b[0])) {
    const prev = out[out.length - 1];
    if (prev && r[0] < prev[1]) prev[1] = Math.max(prev[1], r[1]);
    else out.push(r);
  }
  return out;
}\n`,
  "src/duration.mjs": `export function formatDuration(ms) {
  if (!Number.isInteger(ms) || ms < 0) throw new RangeError("bad ms");
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return \`\${h}h \${m}m \${s % 60}s\`;
}\n`,
  "src/group.mjs": `export const groupBy = (xs, keyFn) => {
  const m = new Map();
  for (const x of xs) m.set(keyFn(x), [...(m.get(keyFn(x)) ?? []), x]);
  return m;
};\n`,
};

const CARELESS_3 = {
  "src/bytes.mjs": `export function formatBytes(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("bad n");
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (Math.round(v * 10) / 10 >= 1024 && i < 4) (v /= 1024, i++);
  return \`\${Math.round(v * 10) / 10} \${units[i]}\`;
}\n`,
  "src/even.mjs": `export const isEven = (n) => n % 2 === 0;\n`,
  "src/words.mjs": `export const words = (s) => s.trim().split(/\\s+/);\n`,
  "src/pick.mjs": `export function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
}\n`,
  "src/leap.mjs": `export const isLeapYear = (y) => y % 4 === 0 && y % 100 !== 0;\n`,
};

const cases = [
  ["orchestration-1", SOLUTIONS_1, CARELESS_1],
  ["orchestration-2", SOLUTIONS_2, CARELESS_2],
  ["orchestration-3", SOLUTIONS_3, CARELESS_3],
];

for (const [id, solutions, careless] of cases) {
  test(`${id}: every task done with its edges is resolved`, async () => {
    expect(await resolves(id, writes(solutions))).toBe(true);
  });

  test(`${id}: a run that leaves out the last file is not resolved`, async () => {
    const files = Object.keys(solutions);
    const rest = Object.fromEntries(Object.entries(solutions).slice(0, -1));
    expect(files.length).toBeGreaterThan(Object.keys(rest).length);
    expect(await resolves(id, writes(rest))).toBe(false);
  });

  for (const [file, text] of Object.entries(careless))
    test(`${id}: a quick \`${file}\` is not resolved`, async () => {
      expect(await resolves(id, writes({ ...solutions, [file]: text }))).toBe(
        false,
      );
    });
}
