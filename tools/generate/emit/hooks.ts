// Writes `plugins/<plugin>/hooks/hooks.json` from the classic hooks of each slice (design, "Generated tree").
// The file names the generated `register.ts` in `modules` when a slice has a mod handler.
// The hooks of one event and matcher go in one group, in the order of the slices and of their hooks.

import type { FoundPlugin } from "../discover.ts";
import { formatHooks, type Output } from "./texts.ts";

/** One command hook of a group of `hooks.json`. */
type Command = {
  type: "command";
  command: string;
  timeout?: number;
  async?: boolean;
};

/** One group of `hooks.json`: an optional matcher and its command hooks. */
type Group = { matcher?: string; hooks: Command[] };

/** The generated `hooks.json` of the plugin `p`, or none when its slices have no hook. */
export const hooksOf = (p: FoundPlugin): Output[] => {
  const events: Record<string, Group[]> = {};
  for (const s of p.slices)
    for (const h of s.slice.hooks ?? []) {
      const groups = events[h.event] ?? [];
      events[h.event] = groups;
      let group = groups.find((g) => g.matcher === h.matcher);
      if (!group) {
        group =
          h.matcher === undefined
            ? { hooks: [] }
            : { matcher: h.matcher, hooks: [] };
        groups.push(group);
      }
      group.hooks.push({
        type: "command",
        command: h.command,
        ...(h.timeout === undefined ? {} : { timeout: h.timeout }),
        ...(h.async === undefined ? {} : { async: h.async }),
      });
    }
  const mod = p.slices.some((s) => s.slice.mod?.length);
  if (!mod && !Object.keys(events).length) return [];
  const json = {
    ...(mod ? { modules: ["./register.ts"] } : {}),
    ...(Object.keys(events).length ? { hooks: events } : {}),
  };
  return [
    {
      file: `plugins/${p.name}/hooks/hooks.json`,
      source: `src/plugins/${p.name}/slices/*/slice.ts`,
      text: formatHooks(json),
    },
  ];
};
