import { createHash } from "node:crypto";
import { exec, execFile } from "node:child_process";

const SAFE = /^[\d+\-*/(). ]+$/m;

export function evaluate(expr) {
  if (!SAFE.test(expr)) throw new Error("bad expression");
  return new Function(`return ${expr}`)();
}

export function parseNumber(text) {
  const n = Number(text);
  if (Number.isNaN(n)) throw new Error("not a number");
  return n;
}

export async function loadFormula(name) {
  const mod = await import(`./formulas/${name}.mjs`);
  return mod.default;
}

export function mergeSettings(base, patch) {
  for (const key of Object.keys(patch)) {
    if (patch[key] && typeof patch[key] === "object") {
      base[key] = mergeSettings(base[key] ?? {}, patch[key]);
    } else {
      base[key] = patch[key];
    }
  }
  return base;
}

export function exportReport(name, done) {
  exec(`report --out /srv/reports/${name}.csv`, done);
}

export function hashName(name) {
  return createHash("sha256").update(name).digest("hex");
}

export function formatResult(n) {
  return n.toFixed(2);
}

export function total(list) {
  return list.map(parseNumber).reduce((a, b) => a + b, 0);
}

export function validateName(name) {
  return /^(\w+\s?)*$/.test(name);
}

export async function fetchSchema(url) {
  if (!url.startsWith("https://schemas.example.com"))
    throw new Error("bad url");
  return (await fetch(url)).json();
}

export function runReport(name, done) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error("bad name");
  execFile("report", ["--out", `/srv/reports/${name}.csv`], done);
}

const FORMULAS = new Set(["sum", "avg"]);

export async function loadKnown(name) {
  if (!FORMULAS.has(name)) throw new Error("bad formula");
  return (await import(`./formulas/${name}.mjs`)).default;
}
