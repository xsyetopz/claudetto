// The hook evals of each plugin (`wiki/development/Plugin-Layout.md`).
// `evals/hooks.json` of a plugin names each hook by its id, the hook-lab test of each case kind, and the model requests and tokens that the hook adds to each turn.
// A hook in a hooks module has its id in a `// eval: <id>` comment on the line above its `on(` call.
// A call that joins several hooks has one such comment for each hook, in the lines above it.
// A classic hook has the id `<event> <command>`, with the plugin root and the `bun` launcher removed, or `<event> prompt`.

import fs from "node:fs";
import path from "node:path";

/**
 * One hook eval entry of `evals/hooks.json`. A test is `<file from the repository root> > <test name>`.
 * A hook that runs a model has its cases in `claude plugin eval`, and a case is `<path of its case.yaml> > <grader name>`.
 */
export type Entry = {
  requests: number;
  tokens: number;
  blocks: boolean;
  allow: string;
  text: string;
  block?: string;
  false?: string;
  eval?: string;
};

/** The `on(` calls of the hooks module files, each with its id or a fault. `files` maps a path to its text. */
export const moduleHooks = (
  files: Record<string, string>,
): {
  ids: string[];
  faults: string[];
} => {
  const ids: string[] = [];
  const faults: string[] = [];
  for (const [file, text] of Object.entries(files)) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (!/^\s*on\(\s*(?:"|$)/.test(line)) return;
      // A call of joined handlers has one `// eval:` line for each handler, in a block above it.
      const above: string[] = [];
      for (let j = i - 1; j >= 0; j--) {
        const id = /^\s*\/\/ eval: (.+)$/.exec(lines[j] ?? "")?.[1]?.trim();
        if (!id) break;
        above.unshift(id);
      }
      if (above.length) ids.push(...above);
      else
        faults.push(
          `${file}:${i + 1}: an \`on(\` call has no \`// eval:\` comment above it`,
        );
    });
  }
  return { ids, faults };
};

/** The ids of the classic hooks of a parsed `hooks.json`. */
export const classicHooks = (json: {
  hooks?: Record<string, { hooks: { type: string; command?: string }[] }[]>;
}): string[] => {
  const ids = new Set<string>();
  for (const [event, groups] of Object.entries(json.hooks ?? {}))
    for (const group of groups)
      for (const hook of group.hooks) {
        if (hook.type !== "command") {
          ids.add(`${event} ${hook.type}`);
          continue;
        }
        const command = (hook.command ?? "")
          .replace(/^bun(?: --no-env-file)? /, "")
          .replace(/"\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]*)"/g, "$1");
        ids.add(`${event} ${command}`);
      }
  return [...ids];
};

/** The grader names of a `claude plugin eval` case file. */
export const graderNames = (text: string): Set<string> => {
  const graders = text.split(/^graders:\s*$/m)[1] ?? "";
  return new Set(
    [...graders.matchAll(/^\s+name:\s*"?([^"\n]+?)"?\s*$/gm)].map(
      (m) => m[1] as string,
    ),
  );
};

/** The names of the `test(` calls in a test file, from a string literal, with line comments before the name skipped. */
export const testNames = (text: string): Set<string> => {
  const names = new Set<string>();
  for (const m of text.matchAll(
    /\btest\((?:\s|\/\/[^\n]*\n)*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g,
  ))
    names.add((m[2] as string).replace(/\\(.)/g, "$1"));
  return names;
};

/** The kinds of test that an entry names. A blocking hook also names a block case and a false-block case. */
const kinds = (entry: Entry) =>
  (entry.blocks
    ? ["allow", "text", "block", "false"]
    : ["allow", "text"]) as (keyof Entry)[];

/** The fault of the test reference `ref` of the case kind `kind`, or none. */
const refFault = async (
  root: string,
  plugin: string,
  id: string,
  kind: keyof Entry,
  ref: unknown,
): Promise<string[]> => {
  const [file, name] = typeof ref === "string" ? ref.split(" > ", 2) : [];
  if (!file || !name)
    return [`${plugin}: the hook \`${id}\` names no \`${kind}\` test`];
  const full = path.join(root, ...file.split("/"));
  const text = fs.existsSync(full) ? await Bun.file(full).text() : "";
  const names = file.endsWith("case.yaml")
    ? graderNames(text)
    : testNames(text);
  return names.has(name)
    ? []
    : [
        `${plugin}: the \`${kind}\` test of the hook \`${id}\` is not in ${file}: ${name}`,
      ];
};

/**
 * The faults of the hook evals of the plugin `plugin` under `root`, each naming the hook.
 * `hooks` are the ids that the code of the plugin has.
 */
export const evalFaults = async (
  root: string,
  plugin: string,
  hooks: string[],
): Promise<string[]> => {
  const file = path.join(root, "plugins", plugin, "evals", "hooks.json");
  const manifest: Record<string, Entry> = fs.existsSync(file)
    ? JSON.parse(await Bun.file(file).text())
    : {};
  const faults: string[] = [];
  for (const id of hooks)
    if (!manifest[id])
      faults.push(
        `${plugin}: the hook \`${id}\` has no entry in \`evals/hooks.json\``,
      );
  for (const [id, entry] of Object.entries(manifest)) {
    if (!hooks.includes(id)) {
      faults.push(
        `${plugin}: \`evals/hooks.json\` names \`${id}\`, which is not a hook of the plugin`,
      );
      continue;
    }
    if (!(entry.requests >= 0 && entry.tokens >= 0))
      faults.push(
        `${plugin}: the hook \`${id}\` records no \`requests\` and \`tokens\` for each turn`,
      );
    for (const kind of kinds(entry))
      faults.push(...(await refFault(root, plugin, id, kind, entry[kind])));
    if (entry.requests > 0) {
      const dir = path.join(root, "plugins", plugin, "evals", entry.eval ?? "");
      if (!entry.eval || !fs.existsSync(path.join(dir, "case.yaml")))
        faults.push(
          `${plugin}: the hook \`${id}\` adds a model request and names no \`claude plugin eval\` case`,
        );
    }
  }
  return faults;
};
