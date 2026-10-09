import fs from "node:fs/promises";

export async function saveAll(file, rows) {
  const text = rows.map((r) => `${JSON.stringify(r)}\n`).join("");
  await fs.writeFile(file, text);
  return rows.length;
}

export async function loadAll(file) {
  const text = await fs.readFile(file, "utf8");
  return text.split("\n").map((line) => JSON.parse(line));
}

export function dedupe(rows) {
  return [...new Set(rows)];
}

export function byId(rows) {
  return new Map(rows.map((r) => [r.id, r]));
}
