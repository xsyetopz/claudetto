// Writes the composition root `plugins/<plugin>/hooks/register.ts` (design, "Generated tree").
// It has a named import of each handler from the `adapters/mod.ts` of its slice,
// and one `on()` call for each handler, with the event and the filter as literals,
// because `claude plugin validate` and the mod runtime read them only as literals in this file.

import path from "node:path";
import type { FoundPlugin } from "../discover.ts";
import { type Entry, filterOf, order } from "../order.ts";
import { type Output, withHeader } from "./texts.ts";

/** The named export of `mod` that is the function `run`, or `undefined` when no export is `run`. */
const exportOf = (
  mod: Readonly<Record<string, unknown>>,
  run: unknown,
): string | undefined =>
  Object.keys(mod)
    .sort()
    .find((key) => key !== "default" && mod[key] === run);

/** The generated `register.ts` of the plugin `p`, or none when its slices have no mod handler. */
export const registerOf = (p: FoundPlugin): Output[] => {
  const where = new Map<Entry, { dir: string; name: string }>();
  const entries: Entry[] = [];
  for (const s of p.slices)
    for (const handler of s.slice.mod ?? []) {
      const name = exportOf(s.mod, handler.run);
      if (!name)
        throw new Error(
          `${path.posix.join(s.dir, "slice.ts")}: the handler of ${handler.event} in the phase ${handler.phase} is not a named export of adapters/mod.ts. Export it there, and use that export in the slice.`,
        );
      const e = { slice: s.name, handler };
      entries.push(e);
      where.set(e, { dir: s.name, name });
    }
  if (!entries.length) return [];
  const imports: string[] = [];
  const calls: string[] = [];
  order(entries).forEach((e, i) => {
    const at = where.get(e) as { dir: string; name: string };
    imports.push(
      `import { ${at.name} as h${i} } from "${path.posix.join("..", "slices", at.dir, "adapters", "mod.ts")}";`,
    );
    const filter = filterOf(e);
    calls.push(
      `  on(${JSON.stringify(e.handler.event)}, ${filter ? `${filter}, ` : ""}h${i});`,
    );
  });
  const file = `plugins/${p.name}/hooks/register.ts`;
  const source = `src/plugins/${p.name}/slices/*/slice.ts`;
  const text = [
    'import type { On } from "claude-code";',
    ...imports,
    "",
    "export function register(on: On): void {",
    ...calls,
    "}",
    "",
  ].join("\n");
  return [{ file, source, text: withHeader(file, source, text) }];
};
