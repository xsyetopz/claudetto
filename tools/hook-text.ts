#!/usr/bin/env -S bun --no-env-file
// Writes the long texts of each `hooks.json` from text files, because a `prompt` hook takes its text inline only.
// The text files keep one sentence on each line, so a reader and a diff see each sentence.
//
//   node tools/hook-text.ts           write each `hooks.json` from its text files
//   node tools/hook-text.ts --check   exit 1 when a `hooks.json` differs from its text files
//
// In `plugins/<name>/hooks/`, `description.txt` gives the `description`, with its lines joined by a space,
// and `<Event>.prompt.txt` gives the `prompt` of the one `prompt` hook of that event, as written.

import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dir, "..");
const PROMPT_FILE = /^([A-Za-z]+)\.prompt\.txt$/;

/** The parts of a `hooks.json` file that this module reads and writes. */
export type HooksFile = {
  description?: string;
  hooks?: Record<string, { hooks: Hook[] }[]>;
  [key: string]: unknown;
};

/** One hook of a `hooks.json` file. */
type Hook = { type: string; prompt?: string };

/** The text of `file` with no newline at its end. */
const textOf = async (file: string): Promise<string> =>
  (await Bun.file(file).text()).replace(/\n+$/, "");

/** The `hooks.json` object of the hooks folder `dir`, with the texts of its text files. */
export async function withTexts(dir: string): Promise<HooksFile> {
  const json = JSON.parse(
    await Bun.file(path.join(dir, "hooks.json")).text(),
  ) as HooksFile;
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name);
    if (name === "description.txt") {
      json.description = (await textOf(file)).split("\n").join(" ");
      continue;
    }
    const event = name.match(PROMPT_FILE)?.[1];
    if (!event) continue;
    const prompts = (json.hooks?.[event] ?? [])
      .flatMap((group) => group.hooks)
      .filter((hook) => hook.type === "prompt");
    if (prompts.length !== 1)
      throw new Error(
        `${file}: ${event} has ${prompts.length} prompt hooks, and the file needs exactly one`,
      );
    (prompts[0] as Hook).prompt = await textOf(file);
  }
  return json;
}

/** The text of a `hooks.json` file for `json`. */
export const format = (json: HooksFile): string =>
  `${JSON.stringify(json, null, 2).replace(/"modules": \[\n\s+("[^"]+")\n\s+\]/, '"modules": [$1]')}\n`;

/** The hooks folders of the plugins. */
export const hookDirs = () =>
  fs
    .readdirSync(path.join(REPO, "plugins"))
    .map((name) => path.join(REPO, "plugins", name, "hooks"))
    .filter((dir) => fs.existsSync(path.join(dir, "hooks.json")));

if (process.argv[1] === import.meta.path) {
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const dir of hookDirs()) {
    const file = path.join(dir, "hooks.json");
    const want = format(await withTexts(dir));
    if ((await Bun.file(file).text()) === want) continue;
    if (check) {
      console.error(
        `${path.relative(REPO, file)} differs from its text files. Run node tools/hook-text.ts.`,
      );
      stale++;
    } else await Bun.write(file, want);
  }
  process.exit(stale ? 1 : 0);
}
