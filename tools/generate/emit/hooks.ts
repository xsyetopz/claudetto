// Writes `plugins/<plugin>/hooks/hooks.json` from the classic hooks of each slice (design, "Generated tree").
// The file names the generated `register.ts` in `modules` when a slice has a mod handler.
// The hooks of one event and matcher go in one group, in the order of the slices and of their hooks.
// When `src/plugins/<plugin>/hooks/hooks.json` exists, the file starts from it, with its texts, so no hook of 0.28.0 is lost.

import fs from "node:fs";
import path from "node:path";
import type { FoundPlugin } from "../discover.ts";
import { fill } from "./fill.ts";
import {
  formatHooks,
  type HooksFile,
  type Output,
  withTexts,
} from "./texts.ts";

/** One command hook of a group of `hooks.json`. */
type Command = {
  type: "command";
  command: string;
  timeout?: number;
  async?: boolean;
};

/** One group of `hooks.json`: an optional matcher and its hooks. */
type Group = { matcher?: string; hooks: { type: string }[] };

/** The `hooks.json` source of the plugin `p` in `root`, with its texts, or an empty object when it does not exist. */
const baseOf = async (root: string, p: FoundPlugin): Promise<HooksFile> => {
  const source = `src/plugins/${p.name}/hooks/hooks.json`;
  const file = path.join(root, source);
  if (!fs.existsSync(file)) return {};
  const text = await fill(
    await Bun.file(file).text(),
    path.join(root, "src", "shared"),
    source,
  );
  return withTexts(path.dirname(file), text);
};

/** The generated `hooks.json` of the plugin `p` of `root`, or none when it has no source, no slice hook, and no mod handler. */
export const hooksOf = async (
  root: string,
  p: FoundPlugin,
): Promise<Output[]> => {
  const base = p.slices.length ? await baseOf(root, p) : {};
  const { description, modules, hooks, ...rest } = base;
  const events = structuredClone((hooks ?? {}) as Record<string, Group[]>);
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
      const command: Command = {
        type: "command",
        command: h.command,
        ...(h.timeout === undefined ? {} : { timeout: h.timeout }),
        ...(h.async === undefined ? {} : { async: h.async }),
      };
      group.hooks.push(command);
    }
  const mod = p.slices.some((s) => s.slice.mod?.length);
  const names = [
    ...new Set([
      ...((modules ?? []) as string[]),
      ...(mod ? ["./register.ts"] : []),
    ]),
  ];
  if (!Object.keys(base).length && !names.length && !Object.keys(events).length)
    return [];
  const json = {
    ...(description === undefined ? {} : { description }),
    ...(names.length ? { modules: names } : {}),
    ...rest,
    ...(Object.keys(events).length ? { hooks: events } : {}),
  };
  return [
    {
      file: `plugins/${p.name}/hooks/hooks.json`,
      source: Object.keys(base).length
        ? `src/plugins/${p.name}/hooks/hooks.json`
        : `src/plugins/${p.name}/slices/*/slice.ts`,
      text: formatHooks(json),
    },
  ];
};
