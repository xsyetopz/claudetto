#!/usr/bin/env bun
// The inventory of the built-in parts of Claude Code.
// It reads one release folder, `external/cc-<version>/` (`strings.txt` and `types-<version>.d.ts`),
// and writes `Builtins.md` with the pages that it links, to the git-ignored `.claudetto/builtins/`.
//
//   bun tools/builtins.ts            write the pages
//   bun tools/builtins.ts --check    exit 1 with the added, removed, and changed rows when the pages differ from a new run
//   bun tools/builtins.ts --strict   exit 1 when a row has the verdict `todo`
//   bun tools/builtins.ts --dir D    read the folder D in place of `SOURCE_DIR`, for a new release
//   bun tools/builtins.ts --out D    write or check the pages in the folder D in place of `OUT_DIR`
//
// `external/` is local only, so no CI recipe runs this tool.

import fs from "node:fs";
import path from "node:path";
import { extract } from "./builtins/extract.ts";
import { diff, render } from "./builtins/render.ts";
import { VERDICTS } from "./builtins/verdicts.ts";

/** The folder of the release that the tool reads when `--dir` is not given. */
const SOURCE_DIR = "external/cc-2.1.305";
const OUT_DIR = ".claudetto/builtins";
const ROOT = path.resolve(import.meta.dir, "..");

const readOld = async (out: string): Promise<Map<string, string>> => {
  // Every `Builtins*.md` page of the folder counts, so a stale page shows as removed.
  const old = new Map<string, string>();
  for (const f of fs.existsSync(out) ? fs.readdirSync(out) : [])
    if (/^Builtins.*\.md$/.test(f))
      old.set(f.slice(0, -3), await Bun.file(path.join(out, f)).text());
  return old;
};

const checkPages = async (
  out: string,
  pages: Map<string, string>,
): Promise<number> => {
  const lines = diff(await readOld(out), pages);
  if (!lines.length) return 0;
  console.error(
    `${lines.length} difference(s) from ${out}:\n${lines
      .slice(0, 40)
      .map((l) => `  ${l}`)
      .join("\n")}`,
  );
  return 1;
};

const writePages = async (
  out: string,
  pages: Map<string, string>,
): Promise<number> => {
  for (const [page, text] of pages)
    await Bun.write(path.join(out, `${page}.md`), text);
  console.log(`Wrote ${pages.size} pages to ${out}.`);
  return 0;
};

const releaseVersion = (dir: string): string =>
  fs
    .readdirSync(dir)
    .map((f) => /^types-(.+)\.d\.ts$/.exec(f)?.[1])
    .find(Boolean) ?? path.basename(dir);

const main = async (): Promise<number> => {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) =>
    path.resolve(ROOT, args[args.indexOf(name) + 1] ?? fallback);
  const dir = args.includes("--dir")
    ? opt("--dir", "")
    : path.resolve(ROOT, SOURCE_DIR);
  const out = args.includes("--out")
    ? opt("--out", "")
    : path.resolve(ROOT, OUT_DIR);
  const strings = Bun.file(path.join(dir, "strings.txt"));
  if (!(await strings.exists())) {
    console.error(
      `No strings.txt in ${dir}. Pass --dir with a release folder.`,
    );
    return 2;
  }
  const parts = extract(await strings.text());
  const pages = render(parts, releaseVersion(dir));
  let code = args.includes("--check")
    ? await checkPages(out, pages)
    : await writePages(out, pages);
  const todo = parts.filter((p) => !VERDICTS[`${p.group}:${p.name}`]).length;
  if (args.includes("--strict") && todo) {
    console.error(`${todo} row(s) have the verdict todo.`);
    code = 1;
  }
  return code;
};

if (import.meta.main) process.exit(await main());
