// Writes the composition root `plugins/<plugin>/hooks/register.ts` (design, "Generated tree").
// It has a named import of each handler from the `adapters/mod.ts` of its slice,
// and one `on()` call for each handler, with the event and the filter as literals,
// because `claude plugin validate` and the mod runtime read them only as literals in this file.
// Each call has the comment `// eval: <event> <slice>` above it, which names its entry in `evals/hooks.json`.
// The unfiltered `observe` handlers of one event share one call, with one comment line for each handler (`joinedCall`).
// A handler with `configure` gets the `userConfig` values of the plugin, which the mod runtime gives to `register` as `options`:
// the register calls each `configure` once with `options`, before the `on()` calls.
// When the hand-written `plugins/<plugin>/hooks/legacy.ts` of the rebuild list exists, the register calls its `register` last.

import fs from "node:fs";
import path from "node:path";
import type { FoundPlugin } from "../discover.ts";
import { type Entry, filterOf, order } from "../order.ts";
import { format, type Output, withHeader } from "./texts.ts";

/** The named export of `mod` that is the function `run`, or `undefined` when no export is `run`. */
const exportOf = (
  mod: Readonly<Record<string, unknown>>,
  run: unknown,
): string | undefined =>
  Object.keys(mod)
    .sort()
    .find((key) => key !== "default" && mod[key] === run);

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The `on()` call of the handler `e`, with its `// eval:` comment, and `hook`, the name of its alias. */
const onCall = (e: Entry, hook: string): string => {
  const filter = filterOf(e);
  const args = [JSON.stringify(e.handler.event), ...(filter ? [filter] : [])];
  return [
    `  // eval: ${e.handler.event} ${e.slice}`,
    `  on(${[...args, hook].join(", ")});`,
  ].join("\n");
};

/**
 * The one `on()` call of `group`, the unfiltered handlers of one event in their order, nested as two registrations are.
 * The first handler gets the `next` of the second, which runs the second handler and then the rest of the chain.
 * Each handler gets the event that the handler before it passed to `next`, or the event of the call.
 * `Object.assign` keeps the members of `next`, such as `is` and `signal`.
 * The comment has one `// eval:` line for each handler, so the eval reader finds each id.
 */
const joinedCall = (
  group: readonly Entry[],
  hookOf: (e: Entry) => string,
): string => {
  const event = (group[0] as Entry).handler.event;
  // The `next` that the handler `i - 1` gets: the handler `i`, with the `next` of the handler `i + 1`.
  const from = (i: number): string =>
    i === group.length
      ? "next"
      : `Object.assign((ev?: typeof e) => ${hookOf(group[i] as Entry)}($, ev ?? e, ${from(i + 1)}), next)`;
  return [
    ...group.map((e) => `  // eval: ${event} ${e.slice}`),
    `  on(${JSON.stringify(event)}, ($, e, next) => ${hookOf(group[0] as Entry)}($, e, ${from(1)}));`,
  ].join("\n");
};

/** The generated `register.ts` of the plugin `p` of `root`, or none when its slices have no mod handler and it has no `legacy.ts`. */
export const registerOf = async (
  root: string,
  p: FoundPlugin,
): Promise<Output[]> => {
  const legacy = fs.existsSync(
    path.join(root, "plugins", p.name, "hooks", "legacy.ts"),
  );
  const where = new Map<Entry, { dir: string; name: string }>();
  const configures = new Set<string>();
  const entries: Entry[] = [];
  const nameOf = (
    s: FoundPlugin["slices"][number],
    fn: unknown,
    part: string,
  ) => {
    const name = exportOf(s.mod, fn);
    if (!name)
      throw new Error(
        `${path.posix.join(s.dir, "slice.ts")}: ${part} is not a named export of adapters/mod.ts. Export it there, and use that export in the slice.`,
      );
    return name;
  };
  for (const s of p.slices)
    for (const handler of s.slice.mod ?? []) {
      const part = `the handler of ${handler.event} in the phase ${handler.phase}`;
      const e = { slice: s.name, handler };
      entries.push(e);
      where.set(e, { dir: s.name, name: nameOf(s, handler.run, part) });
      if (handler.configure)
        configures.add(
          `${s.name}\0${nameOf(s, handler.configure, `the configure of ${part}`)}`,
        );
    }
  if (!entries.length && !legacy) return [];
  // One alias for each export, numbered in the order of the module paths and the export names,
  // so the imports are already in the order of the import sorter of Biome, which formats the file.
  const pairs = [
    ...new Set([
      ...[...where.values()].map((w) => `${w.dir}\0${w.name}`),
      ...configures,
    ]),
  ]
    .map((key) => key.split("\0") as [string, string])
    .sort(([a, x], [b, y]) => compare(a, b) || compare(x, y));
  const alias = new Map(pairs.map(([d, n], i) => [`${d}\0${n}`, `h${i}`]));
  const imports = [...new Set(pairs.map(([d]) => d))].map((dir) =>
    [
      "import { ",
      pairs
        .filter(([d]) => d === dir)
        .map(([d, n]) => `${n} as ${alias.get(`${d}\0${n}`)}`)
        .join(", "),
      ` } from "${path.posix.join("..", "slices", dir, "adapters", "mod.ts")}";`,
    ].join(""),
  );
  const sorted = order(entries);
  const hookOf = (e: Entry): string =>
    alias.get(`${where.get(e)?.dir}\0${where.get(e)?.name}`) as string;
  // The unfiltered handlers of one event that `order` lets share a call: all of them are `observe`.
  const shared = (e: Entry): boolean =>
    e.handler.filter === undefined &&
    sorted.filter(
      (x) =>
        x.handler.filter === undefined && x.handler.event === e.handler.event,
    ).length > 1;
  const calls = sorted.flatMap((e) => {
    if (!shared(e)) return [onCall(e, hookOf(e))];
    const group = sorted.filter(
      (x) => shared(x) && x.handler.event === e.handler.event,
    );
    return group[0] === e ? [joinedCall(group, hookOf)] : [];
  });
  const configured = configures.size > 0;
  const file = `plugins/${p.name}/hooks/register.ts`;
  const source = `src/plugins/${p.name}/slices/*/slice.ts`;
  const text = [
    configured
      ? 'import type { On, PluginOptions } from "claude-code";'
      : 'import type { On } from "claude-code";',
    ...imports,
    ...(legacy ? ['import { register as legacy } from "./legacy.ts";'] : []),
    "",
    configured
      ? "export const register = (on: On, options: PluginOptions): void => {"
      : "export const register = (on: On): void => {",
    ...[...configures].sort().map((key) => `  ${alias.get(key)}(options);`),
    ...calls,
    ...(legacy ? ["  legacy(on);"] : []),
    "};",
    "",
  ].join("\n");
  return [
    { file, source, text: await format(file, withHeader(file, source, text)) },
  ];
};
