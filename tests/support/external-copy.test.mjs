// No file under `wiki/` or `plugins/` copies text from `external/` (task 16.3).
// The method is a shingle match: a run of SHINGLE consecutive words (lowercase, letters and digits)
// that appears in a text file of `external/` and in a shipped file is a copy.
// A URL is not text, so the scan leaves URLs out.
// The scan skips the folders of `external/` that are not third-party text:
// captures, builds of Claude Code, archives, backups, and summaries of this repository.
// Git ignores `external/`, so the scan passes when the folder is missing.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { REPO, tmpDir, walk } from "./repo.mjs";

const SHINGLE = 12;
const TEXT = /\.(?:md|txt|mjs|ts|py|jsonl?|ya?ml|sh)$/;
const OWN = /^(?:capture|cc-[\d.]+|archive|backup|summaries)$/;

function files(dir) {
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) {
    return TEXT.test(dir) ? [dir] : [];
  }
  return walk(dir, { keep: (f) => TEXT.test(f) });
}

/** The words of `text`, lowercase, with no URLs, because two files can link to one page. */
const words = (text) =>
  text
    .replace(/\bhttps?:\/\/[^\s<>()\]]+/g, " ")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];

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
          `${path.relative(REPO, f)}: ${path.relative(REPO, seen.get(s))}`,
        );
        break;
      }
  return found;
}

// A lint of the live repository.
test("lint: no file under `wiki/` or `plugins/` copies text from `external/`", {
  timeout: 30_000,
}, () => {
  const ext = path.join(REPO, "external");
  const folders = fs.existsSync(ext) ? fs.readdirSync(ext) : [];
  const source = folders
    .filter((d) => !OWN.test(d))
    .flatMap((d) => files(path.join(ext, d)));
  const shipped = [
    ...files(path.join(REPO, "wiki")),
    ...files(path.join(REPO, "plugins")),
  ];
  assert.deepEqual(copies(source, shipped), []);
});

test("the scan finds a copied run of words and passes when `external/` is missing", () => {
  const dir = tmpDir("ext");
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
    assert.deepEqual(
      copies([src], [copy, other]).map((c) => c.split(": ")[0]),
      [path.relative(REPO, copy)],
    );
    assert.deepEqual(files(path.join(dir, "missing")), []);
    assert.deepEqual(copies([], [copy]), []);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("a URL that two files both link to is not a copy", () => {
  const dir = tmpDir("ext");
  try {
    const url =
      "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices";
    const src = path.join(dir, "src.md");
    const link = path.join(dir, "link.md");
    fs.writeFileSync(src, `Source: <${url}>.`);
    fs.writeFileSync(link, `See [the guide](${url}) for tags.`);
    assert.deepEqual(copies([src], [link]), []);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
