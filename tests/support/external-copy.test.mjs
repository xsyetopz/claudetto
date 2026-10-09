// No file under `wiki/` or `plugins/` copies text from `external/` (task 16.3).
// The method is a shingle match: a run of SHINGLE consecutive words (lowercase, letters and digits)
// that appears in a text file of `external/` and in a shipped file is a copy.
// The scan skips the folders of `external/` that are not third-party text:
// captures, builds of Claude Code, archives, backups, and summaries of this repository.
// Git ignores `external/`, so the scan passes when the folder is missing.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "../..");
const SHINGLE = 12;
const TEXT = /\.(?:md|txt|mjs|ts|py|jsonl?|ya?ml|sh)$/;
const OWN = /^(?:capture|cc-[\d.]+|archive|backup|summaries)$/;

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  if (fs.statSync(dir).isFile()) return TEXT.test(dir) ? [dir] : [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .flatMap((e) => {
      const f = path.join(e.parentPath, e.name);
      return e.isFile() && TEXT.test(f) && !f.includes("node_modules")
        ? [f]
        : [];
    });
}

/** The words of `text`, lowercase. */
const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** The shingles of `ws`, each SHINGLE consecutive words joined by a space. */
function* shingles(ws) {
  for (let i = 0; i + SHINGLE <= ws.length; i++)
    yield ws.slice(i, i + SHINGLE).join(" ");
}

/** The files of `shipped` that share a shingle with the files of `source`, as "shipped: source". */
function copies(source, shipped) {
  const seen = new Map();
  for (const f of source)
    for (const s of shingles(words(fs.readFileSync(f, "utf8"))))
      if (!seen.has(s)) seen.set(s, f);
  const found = [];
  for (const f of shipped)
    for (const s of shingles(words(fs.readFileSync(f, "utf8"))))
      if (seen.has(s)) {
        found.push(
          `${path.relative(ROOT, f)}: ${path.relative(ROOT, seen.get(s))}`,
        );
        break;
      }
  return found;
}

test("no file under `wiki/` or `plugins/` copies text from `external/`", () => {
  const ext = path.join(ROOT, "external");
  const folders = fs.existsSync(ext) ? fs.readdirSync(ext) : [];
  const source = folders
    .filter((d) => !OWN.test(d))
    .flatMap((d) => files(path.join(ext, d)));
  const shipped = [
    ...files(path.join(ROOT, "wiki")),
    ...files(path.join(ROOT, "plugins")),
  ];
  expect(copies(source, shipped)).toEqual([]);
}, 30_000);

test("the scan finds a copied run of words and passes when `external/` is missing", () => {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "ext-"));
  try {
    const run =
      "one two three four five six seven eight nine ten eleven twelve";
    const src = path.join(dir, "src.txt");
    const copy = path.join(dir, "copy.md");
    const other = path.join(dir, "other.md");
    fs.writeFileSync(src, `intro ${run} outro`);
    fs.writeFileSync(copy, `A line. ${run.toUpperCase()}, then more.`);
    fs.writeFileSync(
      other,
      "one two three four five six seven eight nine ten eleven",
    );
    expect(copies([src], [copy, other]).map((c) => c.split(": ")[0])).toEqual([
      path.relative(ROOT, copy),
    ]);
    expect(files(path.join(dir, "missing"))).toEqual([]);
    expect(copies([], [copy])).toEqual([]);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
