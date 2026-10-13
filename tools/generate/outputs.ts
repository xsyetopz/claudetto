// All the output of the generator: the texts of 0.28.0 and the parts of each slice (design, "Generated tree").
// Two sources of one file are an error, because only one of them can win.

import { discover } from "./discover.ts";
import { evalsOf } from "./emit/evals.ts";
import { hooksOf } from "./emit/hooks.ts";
import { manifestOf } from "./emit/manifest.ts";
import { registerOf } from "./emit/register.ts";
import { slicesOf } from "./emit/slices.ts";
import { snippetParts } from "./emit/snippet.ts";
import { type Output, outputs, stale } from "./emit/texts.ts";
import { strays } from "./stray.ts";

/** Each generated file of the repository `root`. It throws when two sources make one file. */
export const generated = async (root: string): Promise<Output[]> => {
  const made = await outputs(root);
  const plugins = await discover(root);
  const parts = await snippetParts(root, plugins);
  for (const p of plugins)
    made.push(
      ...(await manifestOf(root, p)),
      ...(await evalsOf(p)),
      ...(await hooksOf(root, p)),
      ...(await registerOf(p)),
      ...(await slicesOf(root, p, parts)),
    );
  const sources = new Map<string, string>();
  for (const o of made) {
    const other = sources.get(o.file);
    if (other !== undefined)
      throw new Error(
        `${o.file} has two sources, ${other} and ${o.source}. Remove one of them.`,
      );
    sources.set(o.file, o.source);
  }
  return made;
};

/** The messages for each file of `root` that differs from `made`, and for each file in `plugins/` that the generator did not write. */
export const problems = async (
  root: string,
  made: Output[],
): Promise<string[]> => [
  ...(await stale(root, made)),
  ...(await strays(
    root,
    made.map((o) => o.file),
  )),
];
