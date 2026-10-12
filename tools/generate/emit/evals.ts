// Writes `plugins/<plugin>/evals/hooks.json` from the `evals` field of the mod handlers of each slice (design, "Generated tree").
// The id of an entry is `<event> <slice>`, as in the `// eval:` comment above the `on()` call in `register.ts`.
// The handlers of one slice on one event share one entry, so their `evals` must be equal when more than one names them.
// A plugin whose handlers name no `evals` gets no file, because its file is still hand-written on the rebuild list.

import type { FoundPlugin } from "../discover.ts";
import { order } from "../order.ts";
import { format, type Output } from "./texts.ts";

/** The generated `evals/hooks.json` of the plugin `p`, or none when no handler names `evals`. */
export const evalsOf = async (p: FoundPlugin): Promise<Output[]> => {
  const entries = order(
    p.slices.flatMap((s) =>
      (s.slice.mod ?? []).map((handler) => ({ slice: s.name, handler })),
    ),
  );
  const manifest: Record<string, unknown> = {};
  for (const { slice, handler } of entries) {
    if (!handler.evals) continue;
    const id = `${handler.event} ${slice}`;
    const text = JSON.stringify(handler.evals);
    const other = manifest[id];
    if (other !== undefined && JSON.stringify(other) !== text)
      throw new Error(
        `slice ${slice}: the handlers of ${handler.event} name different \`evals\`. Give them one equal value.`,
      );
    manifest[id] = handler.evals;
  }
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
