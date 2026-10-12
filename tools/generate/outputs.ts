// All the output of the generator: the texts of 0.28.0 and the parts of each slice (design, "Generated tree").
// Two sources of one file are an error, because only one of them can win.

import { discover } from "./discover.ts";
import { hooksOf } from "./emit/hooks.ts";
import { manifestOf } from "./emit/manifest.ts";
import { registerOf } from "./emit/register.ts";
import { slicesOf } from "./emit/slices.ts";
import { snippetOf } from "./emit/snippet.ts";
import { type Output, outputs, stale } from "./emit/texts.ts";
import { unlisted } from "./pending.ts";

/** Each generated file of the repository `root`. It throws when two sources make one file. */
export const generated = async (root: string): Promise<Output[]> => {
  const made = await outputs(root);
  for (const p of await discover(root))
    made.push(
      ...(await manifestOf(root, p)),
      ...(await hooksOf(root, p)),
      ...registerOf(root, p),
      ...(await slicesOf(root, p)),
      ...(await snippetOf(root, p)),
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

/** The messages for each file of `root` that differs from `made`, and for each file in `plugins/` that has no source and no line in the rebuild list. */
export const problems = async (
  root: string,
  made: Output[],
): Promise<string[]> => [
  ...(await stale(root, made)),
  ...(await unlisted(
    root,
    made.map((o) => o.file),
  )),
];
