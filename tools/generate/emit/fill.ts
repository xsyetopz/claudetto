// Fills the includes and the values of a source text (design, "Generated tree").
// In a source, a line `{{include NAME}}` gives the text of `src/fragments/NAME.md`, `{{include NAME.json}}` the text of `src/fragments/NAME.json`, and `{{NAME}}` the value of the limit `NAME` of `values`.
// The default `values` is `VALUES`, and the text of a slice prompt gets the limits of its slice too (`emit/prompts.ts`).
// `{{include snippet.json}}` gives the settings snippet of the core plugin, which `emit/snippet.ts` computes from the slices.

import fs from "node:fs";
import path from "node:path";
import {
  BASH_OUTPUT_MAX_CHARS,
  CONTEXT_WINDOW,
  USAGE_LEVELS,
} from "../../../src/kernel/budget.ts";
import { MAX_ROWS } from "../../../src/plugins/claudetto/slices/statusline/limits.ts";

/**
 * The values of the cut slices `agents` and `asks`, which the pages of `src/wiki/` still name.
 * Remove them with those pages, after the 0.2.0 release tag.
 */
const CUT_VALUES = {
  FILE_MAX_BYTES: 1_000_000,
  HAIKU_CONTEXT_MAX: 85_000,
  REPORT_MAX_WORDS: 400,
  SUBAGENT_CONTEXT_MAX: 100_000,
};

/** The limits that a source can name as `{{NAME}}`, from the one place in code where each is set. A number has the `300,000` form of the docs. */
export const VALUES: Record<string, string> = Object.fromEntries(
  Object.entries({
    BASH_OUTPUT_MAX_CHARS,
    CONTEXT_WINDOW,
    MAX_ROWS,
    ...CUT_VALUES,
    USAGE_LEVEL_LOW: USAGE_LEVELS[0],
    USAGE_LEVEL_HIGH: USAGE_LEVELS[1],
  }).map(([name, value]) => [name, value.toLocaleString("en-US")]),
);

const INCLUDE = /^\{\{include ([a-z0-9-]+(?:\.json)?)\}\}$/gm;
const VALUE = /\{\{([A-Z0-9_]+)\}\}/g;

/** `p` in the `/` form that the repository paths of this tool use. */
const posix = (p: string) => p.split(path.sep).join(path.posix.sep);

/** The text of `file` with no newline at its end. */
export const textOf = async (file: string): Promise<string> =>
  (await Bun.file(file).text()).replace(/\n+$/, "");

/** `text` with each include and value of the source `source` filled in from `fragments`, or from `made` for a name that `made` gives, and from `values`. */
export const fill = async (
  text: string,
  fragments: string,
  source: string,
  made: Record<string, string> = {},
  values: Record<string, string> = VALUES,
): Promise<string> => {
  const names = [...text.matchAll(INCLUDE)].map((m) => m[1] as string);
  const parts: Record<string, string> = {};
  for (const name of names) {
    if (name in made) {
      parts[name] = (made[name] as string).replace(/\n+$/, "");
      continue;
    }
    const file = path.join(
      fragments,
      name.endsWith(".json") ? name : `${name}.md`,
    );
    if (!fs.existsSync(file))
      throw new Error(
        `${source}: no fragment ${posix(path.relative(path.dirname(fragments), file))}`,
      );
    parts[name] = await textOf(file);
  }
  const included = text.replace(
    INCLUDE,
    (_m, name: string) => parts[name] as string,
  );
  return included.replace(VALUE, (_m, name: string) => {
    if (!(name in values)) throw new Error(`${source}: no value {{${name}}}`);
    return values[name] as string;
  });
};
