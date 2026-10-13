// Writes `plugins/<plugin>/evals/hooks.json` from the `evals` field of the classic hooks and the mod handlers of each slice (design, "Generated tree").
// The id of a mod handler is `<event> <slice>`, as in the `// eval:` comment above the `on()` call in `register.ts`.
// The id of a classic hook is its event and its command, without the `bun` launcher and the plugin root, as in `hooks/hooks.json`.
// The handlers of one slice on one event share one entry, so their `evals` must be equal when more than one names them.
// A plugin whose hooks name no `evals` gets no file.

import type { HookEvals } from "../../../src/kernel/slice.ts";
import type { FoundPlugin } from "../discover.ts";
import { order } from "../order.ts";
import { format, type Output } from "./texts.ts";

/** The id of a classic hook: its command, with the `bun` launcher and the plugin root removed. */
export const commandId = (command: string): string =>
  command
    .replace(/^bun(?: --no-env-file)? /, "")
    .replace(/"\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]*)"/g, "$1");

/** The generated `evals/hooks.json` of the plugin `p`, or none when no hook names `evals`. */
export const evalsOf = async (p: FoundPlugin): Promise<Output[]> => {
  const manifest: Record<string, HookEvals> = {};
  const add = (id: string, slice: string, evals: HookEvals): void => {
    const other = manifest[id];
    if (other !== undefined && JSON.stringify(other) !== JSON.stringify(evals))
      throw new Error(
        `slice ${slice}: the handlers of ${id} name different \`evals\`. Give them one equal value.`,
      );
    manifest[id] = evals;
  };
  for (const s of p.slices)
    for (const hook of s.slice.hooks ?? [])
      if (hook.evals)
        add(`${hook.event} ${commandId(hook.command)}`, s.name, hook.evals);
  const entries = order(
    p.slices.flatMap((s) =>
      (s.slice.mod ?? []).map((handler) => ({ slice: s.name, handler })),
    ),
  );
  for (const { slice, handler } of entries)
    if (handler.evals) add(`${handler.event} ${slice}`, slice, handler.evals);
  if (!Object.keys(manifest).length) return [];
  const file = `plugins/${p.name}/evals/hooks.json`;
  return [
    {
      file,
      source: `src/plugins/${p.name}/slices/*/slice.ts`,
      text: await format(file, `${JSON.stringify(manifest)}\n`),
    },
  ];
};
