#!/usr/bin/env node
// Writes the long texts of each `hooks.json` from text files, because a `prompt` hook takes its text inline only.
// The text files keep one sentence on each line, so a reader and a diff see each sentence.
//
//   node tools/hook-text.mjs           write each `hooks.json` from its text files
//   node tools/hook-text.mjs --check   exit 1 when a `hooks.json` differs from its text files
//
// In `plugins/<name>/hooks/`, `description.txt` gives the `description`, with its lines joined by a space,
// and `<Event>.prompt.txt` gives the `prompt` of the one `prompt` hook of that event, as written.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPT_FILE = /^([A-Za-z]+)\.prompt\.txt$/;

/** The text of `file` with no newline at its end. */
const textOf = (file) => fs.readFileSync(file, "utf8").replace(/\n+$/, "");

/**
 * The `hooks.json` object of the hooks folder `dir`, with the texts of its text files.
 *
 * @param {string} dir
 */
export function withTexts(dir) {
  const json = JSON.parse(
    fs.readFileSync(path.join(dir, "hooks.json"), "utf8"),
  );
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name);
    if (name === "description.txt") {
      json.description = textOf(file).split("\n").join(" ");
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
    prompts[0].prompt = textOf(file);
  }
  return json;
}

/** The text of a `hooks.json` file for `json`. */
export const format = (json) =>
  `${JSON.stringify(json, null, 2).replace(/"modules": \[\n\s+("[^"]+")\n\s+\]/, '"modules": [$1]')}\n`;

/** The hooks folders of the plugins. */
export const hookDirs = () =>
  fs
    .readdirSync(path.join(REPO, "plugins"))
    .map((name) => path.join(REPO, "plugins", name, "hooks"))
    .filter((dir) => fs.existsSync(path.join(dir, "hooks.json")));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const dir of hookDirs()) {
    const file = path.join(dir, "hooks.json");
    const want = format(withTexts(dir));
    if (fs.readFileSync(file, "utf8") === want) continue;
    if (check) {
      console.error(
        `${path.relative(REPO, file)} differs from its text files. Run node tools/hook-text.mjs.`,
      );
      stale++;
    } else fs.writeFileSync(file, want);
  }
  process.exit(stale ? 1 : 0);
}
