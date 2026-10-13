// Code in `plugins/` and `tools/` builds paths with `node:path`, `import.meta.dir`, and `Bun.fileURLToPath`, not with a literal `/` join (`AGENTS.md`, the hooks module rule).
// A file in the import graph of a hooks module is out of scope: the mod runtime has no path API, so that file joins with `/`.
// A text such as `done/total` or a URL is not a path, so the template check finds only an operand with a path name.
// The hook-lab tests (`plugins/*/tests/`) are out of scope, as in `repoFiles`.

import { expect, test } from "bun:test";
import { type Files, moduleGraph, repoFiles } from "./import-rules.ts";

// Comments hold sample paths, so they are removed before the search.
const stripComments = (src: string): string =>
  src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

/** The ways to join a path with a literal `/`: a template operand with a path name, `.join("/")`, and a `+` with `"/"`.
 * An escaped `\${` is literal text, such as the `${CLAUDE_PLUGIN_ROOT}` of a hook command that Claude Code fills in, so it is not an operand. */
const JOINS = [
  /(?<!\\)\$\{[^}]*(?:dir|path|root|home|file|folder)\b[^}]*\}\//i,
  /\.join\(\s*["'`]\/["'`]\s*\)/,
  /["'`]\/["'`]\s*\+|\+\s*["'`]\//,
];

/** Each line of `files` outside the hooks module graphs that joins a path with a literal `/`, as `file:line: text`. */
const slashJoins = (files: Files): string[] => {
  const graph = moduleGraph(files);
  const found: string[] = [];
  for (const [file, source] of Object.entries(files)) {
    if (graph.has(file)) continue;
    stripComments(source)
      .split("\n")
      .forEach((line, i) => {
        if (JOINS.some((re) => re.test(line)))
          found.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  }
  return found;
};

test("no file in `plugins/` or `tools/` joins a path with a literal `/`, outside the hooks module graphs", async () => {
  const found = slashJoins(await repoFiles(["plugins", "tools"]));
  expect(found, found.join("\n")).toStrictEqual([]);
});

test("the search finds each form of a `/` join, and skips the hooks module graph, display text, and an escaped `${`", () => {
  const files: Files = {
    "plugins/x/hooks/register.ts": 'import { a } from "../lib/a.ts";',
    "plugins/x/lib/a.ts": `export const a = (root) => \`\${root}/hooks\`;`,
    "plugins/x/bin/b.ts": [
      `const t = \`\${transcriptPath}/subagents\`;`,
      'const u = ["a", "b"].join("/");',
      'const v = dir + "/x";',
      `const w = \`\${spec.done}/\${spec.total}\`;`,
      `const h = \`bun "\\\${CLAUDE_PLUGIN_ROOT}/hook.ts"\`;`,
    ].join("\n"),
  };
  expect(slashJoins(files)).toStrictEqual([
    `plugins/x/bin/b.ts:1: const t = \`\${transcriptPath}/subagents\`;`,
    'plugins/x/bin/b.ts:2: const u = ["a", "b"].join("/");',
    'plugins/x/bin/b.ts:3: const v = dir + "/x";',
  ]);
});
