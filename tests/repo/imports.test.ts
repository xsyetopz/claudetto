// The import rules of the plugins (D4 of change `redesign-0-4-0`, rules `plugin-imports.md` and `hooks-module.md`).
// Each rule is a pure function from a map of path to source to a list of faults.
// The test runs each rule over the files of `plugins/`, and breaks each rule with a fixture.

import { expect, test } from "bun:test";
import {
  edges,
  type Files,
  inside,
  moduleGraph,
  parseImports,
  repoFiles,
  resolve,
  stripComments,
} from "../support/graph.ts";

const P = "plugins/claudetto";
const KERNEL = `${P}/kernel/`;

/** The module of a path of `plugins/claudetto/modules/`, and the path in the module. */
const moduleOf = (file: string): { name: string; rest: string } | null => {
  const m = /^plugins\/claudetto\/modules\/([^/]+)\/(.+)$/.exec(file);
  return m ? { name: m[1] as string, rest: m[2] as string } : null;
};

/** A file outside a module imports only its `index.ts`. `bin/` has its own rule. */
const checkModuleIndex = (files: Files): string[] =>
  edges(files).flatMap(({ file, spec, target }) => {
    const to = target && moduleOf(target);
    if (!to || to.rest === "index.ts" || file.startsWith(`${P}/bin/`))
      return [];
    return moduleOf(file)?.name === to.name
      ? []
      : [`${file}: imports ${spec}, past the index.ts of module ${to.name}`];
  });

/** A `bin/` file imports only the `cli.ts` of a module. */
const checkBin = (files: Files): string[] =>
  edges(files)
    .filter(({ file, target }) => file.startsWith(`${P}/bin/`) && target)
    .filter(({ target }) => moduleOf(target as string)?.rest !== "cli.ts")
    .map(({ file, spec }) => `${file}: imports ${spec}, not a module cli.ts`);

/** Each pair of modules that reach each other through imports. */
const checkCycles = (files: Files): string[] => {
  const graph = new Map<string, Set<string>>();
  for (const { file, target } of edges(files)) {
    const [from, to] = [moduleOf(file)?.name, target && moduleOf(target)?.name];
    if (from && to && from !== to)
      graph.set(from, (graph.get(from) ?? new Set()).add(to));
  }
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>();
    const queue = [from];
    for (let next = queue.pop(); next !== undefined; next = queue.pop())
      for (const n of graph.get(next) ?? [])
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
    return seen.has(to);
  };
  const names = [...graph.keys()].sort();
  return names.flatMap((a) =>
    names
      .filter((b) => a < b && reaches(a, b) && reaches(b, a))
      .map((b) => `modules ${a} and ${b} import each other`),
  );
};

/** A kernel file imports no module. */
const checkKernel = (files: Files): string[] =>
  edges(files)
    .filter(({ file, target }) => file.startsWith(KERNEL) && target)
    .filter(({ target }) => moduleOf(target as string))
    .map(({ file, spec }) => `${file}: kernel imports ${spec}, a module`);

/** `register.ts` imports only `claude-code`, a module `index.ts`, and the kernel. */
const checkRegister = (files: Files): string[] =>
  edges(files)
    .filter(
      ({ file, spec }) =>
        file === `${P}/hooks/register.ts` && spec !== "claude-code",
    )
    .filter(
      ({ target }) =>
        !target?.startsWith(KERNEL) &&
        moduleOf(target ?? "")?.rest !== "index.ts",
    )
    .map(
      ({ file, spec }) =>
        `${file}: imports ${spec}, not a module index.ts or the kernel`,
    );

/** A file of a `domain/` folder imports no adapter and no `kernel/node/` file. */
const checkDomain = (files: Files): string[] =>
  edges(files)
    .filter(
      ({ file, target }) =>
        file.includes("/domain/") &&
        /\/(adapters|kernel\/node)\//.test(target ?? ""),
    )
    .map(({ file, spec }) => `${file}: domain imports ${spec}`);

/** No file other than a `register.ts` calls `on(`. */
const checkOnCalls = (files: Files): string[] =>
  Object.entries(files)
    .filter(([file]) => !file.endsWith("/hooks/register.ts"))
    .filter(([, src]) => /(?<![\w.$])on\(/.test(stripComments(src)))
    .map(([file]) => `${file}: on() call outside register.ts`);

/** No test file is in `plugins/` outside `plugins/claudetto/tests/`, which `repoFiles` leaves out. */
const checkTestFiles = (files: Files): string[] =>
  Object.keys(files)
    .filter((file) => /\.test\.[cm]?[jt]s$/.test(file))
    .map((file) => `${file}: test file outside plugins/claudetto/tests/`);

/** Each literal `$.state` ref key is in the `STATE_KEYS` of a module `state.ts`. */
const checkStateKeys = (files: Files): string[] => {
  const listed = new Set(
    Object.entries(files)
      .filter(([file]) => moduleOf(file)?.rest === "state.ts")
      .flatMap(([, src]) => [
        ...(/STATE_KEYS = \[([^\]]*)\]/.exec(src)?.[1] ?? "").matchAll(
          /"([^"]+)"/g,
        ),
      ])
      .map((m) => m[1]),
  );
  return Object.entries(files).flatMap(([file, src]) =>
    [...src.matchAll(/\{\s*plugin:\s*"claudetto",\s*key:\s*"([^"]+)"/g)]
      .filter((m) => !listed.has(m[1]))
      .map((m) => `${file}: state key ${m[1]} is in no STATE_KEYS`),
  );
};

/** No import leaves its plugin, so none reaches another plugin, `tools/`, `dev/`, or `tests/`. */
const checkPluginBoundary = (files: Files): string[] =>
  edges(files)
    .filter(({ file, target }) => target && !inside(file, target))
    .map(({ file, spec }) => `${file}: import ${spec} leaves its plugin`);

/** Each relative import reaches a file of its own plugin, so an add-on holds its own copy of each kernel file that it uses. */
const checkTargets = (files: Files): string[] =>
  edges(files)
    .filter(
      ({ file, target }) =>
        target && !(inside(file, target) && target in files),
    )
    .map(({ file, spec }) => `${file}: import ${spec} has no file`);

// A value import of "claude-code": an `import` that is not `import type`.
const CLAUDE_CODE_VALUE =
  /^[ \t]*import\s+(?!type\b)[^;]*?\bfrom\s*["']claude-code["']/m;

/** A plugin imports only relative files, `node:` modules, `bun:` modules, and the types of `claude-code`, never a package. */
const checkNoPackages = (files: Files): string[] =>
  edges(files)
    .filter(
      ({ file, spec }) =>
        !spec.startsWith(".") &&
        !spec.startsWith("node:") &&
        !spec.startsWith("bun:") &&
        !(
          spec === "claude-code" &&
          !CLAUDE_CODE_VALUE.test(files[file] as string)
        ),
    )
    .map(({ file, spec }) => `${file}: bare import ${spec}`);

// The mod runtime loads only relative files and "claude-code" in a hooks module, and it has no `Bun` global (`research/probes.md`, 2.16).
const moduleFaults = (file: string, source: string): string[] => {
  const code = stripComments(source);
  const bad = parseImports(source).flatMap((imp) => {
    if (imp.dynamic) return [`${file}: import() in the module graph`];
    return resolve(file, imp.spec) || imp.spec === "claude-code"
      ? []
      : [`${file}: ${imp.spec} in the module graph`];
  });
  if (/(?<![\w.$])Bun\b/.test(code))
    bad.push(`${file}: Bun global in the module graph`);
  for (const m of code.matchAll(/(?<![\w.$])on\((?!\s*["'])/g))
    bad.push(`${file}: on() event name is not a string literal at ${m.index}`);
  return bad;
};

/** The graph of a hooks module has no `node:` or `bun:` import, no `import()`, no `Bun`, and literal `on()` names. */
const checkModuleGraph = (files: Files): string[] =>
  [...moduleGraph(files)].flatMap((file) =>
    moduleFaults(file, files[file] as string),
  );

const RULES = {
  checkModuleIndex,
  checkBin,
  checkCycles,
  checkKernel,
  checkRegister,
  checkDomain,
  checkOnCalls,
  checkTestFiles,
  checkStateKeys,
  checkPluginBoundary,
  checkTargets,
  checkNoPackages,
  checkModuleGraph,
};

/** The kernel files that no file outside the kernel reaches through imports. */
const unreached = (files: Files): string[] => {
  const all = edges(files);
  const reached = new Set<string>();
  const queue = all
    .filter(({ file }) => !file.startsWith(KERNEL))
    .map(({ target }) => target);
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    if (next === null || !next.startsWith(KERNEL) || reached.has(next))
      continue;
    reached.add(next);
    for (const e of all) if (e.file === next) queue.push(e.target);
  }
  return Object.keys(files)
    .filter((f) => f.startsWith(KERNEL) && !reached.has(f))
    .sort();
};

test("the plugins hold the files that the rules read", async () => {
  const files = Object.keys(await repoFiles());
  for (const file of [
    `${P}/hooks/register.ts`,
    `${P}/kernel/hooks.ts`,
    `${P}/modules/session/prompt/adapters/mod.ts`,
    `${P}/modules/gate/state.ts`,
    `${P}/bin/minispec`,
  ])
    expect(files.includes(file), file).toBeTruthy();
});

for (const [name, check] of Object.entries(RULES))
  test(`the plugins pass \`${name}\``, async () => {
    expect(check(await repoFiles())).toStrictEqual([]);
  });

test("each kernel file has an importer outside the kernel, directly or through other kernel files", async () => {
  const files = await repoFiles(["plugins", "tools", "dev"]);
  expect(Object.keys(files).some((f) => f.startsWith(KERNEL))).toBeTruthy();
  expect(unreached(files)).toStrictEqual([]);
});

test("`parseImports` reads static, re-export, side-effect, and dynamic imports, and skips comments", () => {
  const src = [
    '/** @type {import("x").Y} */',
    '// import a from "commented";',
    'import a from "./a.ts";',
    'import {\n  b,\n} from "../b.ts";',
    'export * from "node:fs";',
    'import "./side.ts";',
    'const m = await import("./d.ts");',
    "const n = import(name);",
  ].join("\n");
  expect(parseImports(src)).toStrictEqual([
    { spec: "./a.ts", dynamic: false },
    { spec: "../b.ts", dynamic: false },
    { spec: "node:fs", dynamic: false },
    { spec: "./side.ts", dynamic: false },
    { spec: "./d.ts", dynamic: true },
    { spec: null, dynamic: true },
  ]);
});

/** Checks that `found` holds one fault for each row of `rows`, in order, and that each fault holds the values of its row (a file, an import, a key name). */
const expectFaults = (found: readonly string[], rows: string[][]): void => {
  expect(found).toHaveLength(rows.length);
  rows.forEach((values, i) => {
    for (const value of values) expect(found[i]).toContain(value);
  });
};

test("Deep Import: a file outside a module imports a module file other than `index.ts`, also from a `cli.ts`, and an `index.ts` or a file of its own module passes", () => {
  const files = {
    [`${P}/modules/work/a.ts`]:
      'import { p } from "../gate/domain/paths.ts";\nimport { g } from "../gate/index.ts";\nimport { b } from "./domain/b.ts";',
    [`${P}/modules/jev/cli.ts`]: 'import { s } from "../setup/rules.ts";',
    [`${P}/snippets.ts`]: 'export { S } from "./modules/setup/index.ts";',
  };
  expectFaults(checkModuleIndex(files), [
    [`${P}/modules/work/a.ts`, "../gate/domain/paths.ts"],
    [`${P}/modules/jev/cli.ts`, "../setup/rules.ts"],
  ]);
});

test("a `bin/` file that imports a module file other than `cli.ts`, or the kernel, fails", () => {
  const files = {
    [`${P}/bin/x`]:
      'import { a } from "../modules/jev/cli.ts";\nimport { b } from "../modules/jev/index.ts";\nimport { c } from "../kernel/a.ts";',
  };
  expectFaults(checkBin(files), [
    [`${P}/bin/x`, "../modules/jev/index.ts"],
    [`${P}/bin/x`, "../kernel/a.ts"],
  ]);
});

test("Cycle: two modules that import each other fail, through a third module too, and a one-way import passes", () => {
  const files = {
    [`${P}/modules/gate/index.ts`]: 'export * from "../work/index.ts";',
    [`${P}/modules/work/index.ts`]: 'export * from "../gate/index.ts";',
    [`${P}/modules/jev/index.ts`]:
      'export * from "../shell/index.ts";\nexport * from "../spec/index.ts";',
    [`${P}/modules/spec/index.ts`]: 'export * from "../setup/index.ts";',
    [`${P}/modules/setup/index.ts`]: 'export * from "../jev/index.ts";',
  };
  expectFaults(checkCycles(files), [
    ["gate", "work"],
    ["jev", "setup"],
    ["jev", "spec"],
    ["setup", "spec"],
  ]);
});

test("Kernel Imports a Module: a kernel file that imports a module fails", () => {
  const files = {
    [`${P}/kernel/a.ts`]:
      'import { s } from "../modules/session/index.ts";\nimport { t } from "./text.ts";',
  };
  expectFaults(checkKernel(files), [
    [`${P}/kernel/a.ts`, "../modules/session/index.ts"],
  ]);
});

test("`register.ts` that imports a file other than a module `index.ts`, the kernel, or `claude-code` fails", () => {
  const files = {
    [`${P}/hooks/register.ts`]: [
      'import type { On } from "claude-code";',
      'import { o } from "../kernel/options.ts";',
      'import { g } from "../modules/gate/index.ts";',
      'import { d } from "../skills/setup/scripts/settings.ts";',
      'import { p } from "../modules/gate/domain/paths.ts";',
      'import { x } from "./other.ts";',
    ].join("\n"),
  };
  expectFaults(checkRegister(files), [
    [`${P}/hooks/register.ts`, "../skills/setup/scripts/settings.ts"],
    [`${P}/hooks/register.ts`, "../modules/gate/domain/paths.ts"],
    [`${P}/hooks/register.ts`, "./other.ts"],
  ]);
});

test("a `domain/` file that imports an adapter or `kernel/node/` fails, and a `domain/` or `kernel/` import passes", () => {
  const files = {
    [`${P}/modules/gate/domain/a.ts`]: [
      'import { m } from "../adapters/mod.ts";',
      'import { f } from "../../../kernel/node/fs.ts";',
      'import { t } from "../../../kernel/text.ts";',
      'import { b } from "./b.ts";',
    ].join("\n"),
  };
  expectFaults(checkDomain(files), [
    [`${P}/modules/gate/domain/a.ts`, "../adapters/mod.ts"],
    [`${P}/modules/gate/domain/a.ts`, "../../../kernel/node/fs.ts"],
  ]);
});

test("Rule Outside the Register File: a module that calls `on(` fails, and `register.ts`, a comment, and `.on(` pass", () => {
  const files = {
    [`${P}/hooks/register.ts`]: 'on("tool.check", h);',
    [`${P}/modules/gate/adapters/mod.ts`]:
      '// on("x", y)\nemitter.on("x", y);\non("tool.check", h);',
    [`${P}/modules/work/a.ts`]: "// on(\nconst won = (a) => a;\nwon(1);",
  };
  expectFaults(checkOnCalls(files), [[`${P}/modules/gate/adapters/mod.ts`]]);
});

test("Test in a Module: a test file in `plugins/` outside `plugins/claudetto/tests/` fails", () => {
  const files = {
    [`${P}/modules/gate/x.test.ts`]: "",
    [`${P}/modules/gate/x.ts`]: "",
  };
  expectFaults(checkTestFiles(files), [[`${P}/modules/gate/x.test.ts`]]);
});

test("a `$.state` ref key that no `STATE_KEYS` lists fails", () => {
  const files = {
    [`${P}/modules/work/state.ts`]:
      'export const STATE_KEYS = [\n  "note",\n  "notes",\n] as const;',
    [`${P}/modules/work/a.ts`]:
      'const a = { plugin: "claudetto", key: "notes" } as const;\nconst b = { plugin: "claudetto", key: "nope" } as const;',
  };
  expectFaults(checkStateKeys(files), [[`${P}/modules/work/a.ts`, "nope"]]);
});

test("an import that leaves its plugin is a fault, for a plugin, `tools`, `dev`, and `tests`", () => {
  const files = {
    "plugins/claudetto-browser/hooks/register.ts": [
      'import { a } from "../../claudetto/lib/budget.ts";',
      'import { b } from "../../../tools/limits.ts";',
      'import { c } from "../../../tests/support/x.ts";',
      'import { e } from "../../../dev/x.ts";',
      'import { d } from "../features/browser/rules.ts";',
    ].join("\n"),
  };
  const file = "plugins/claudetto-browser/hooks/register.ts";
  expectFaults(checkPluginBoundary(files), [
    [file, "../../claudetto/lib/budget.ts"],
    [file, "../../../tools/limits.ts"],
    [file, "../../../tests/support/x.ts"],
    [file, "../../../dev/x.ts"],
  ]);
});

test("an add-on that imports the kernel of another plugin fails", () => {
  const files = {
    "plugins/claudetto/kernel/budget.ts": "export const B = 1;\n",
    "plugins/claudetto-x/slices/s/slice.ts":
      'import { B } from "../../../claudetto/kernel/budget.ts";\n',
  };
  const file = "plugins/claudetto-x/slices/s/slice.ts";
  const target = "../../../claudetto/kernel/budget.ts";
  expectFaults(
    [...checkPluginBoundary(files), ...checkTargets(files)],
    [
      [file, target],
      [file, target],
    ],
  );
});

test("an add-on with no copy of a kernel file that it imports fails", () => {
  const files = {
    "plugins/claudetto-x/slices/s/slice.ts":
      'import { B } from "../../kernel/budget.ts";\n',
  };
  expectFaults(checkTargets(files), [
    ["plugins/claudetto-x/slices/s/slice.ts", "../../kernel/budget.ts"],
  ]);
});

test("a kernel file that only another kernel file imports, with no outside importer, fails", () => {
  const files = {
    [`${KERNEL}a.ts`]: 'import { b } from "../kernel/b.ts";\n',
    [`${KERNEL}b.ts`]: "export const b = 1;\n",
    [`${KERNEL}c.ts`]: "export const c = 1;\n",
    [`${P}/modules/s/index.ts`]: 'import { c } from "../../kernel/c.ts";\n',
  };
  expect(unreached(files)).toStrictEqual([`${KERNEL}a.ts`, `${KERNEL}b.ts`]);
});

test("a package import is a fault, and a `node:` import is not", () => {
  const files = {
    [`${P}/skills/setup/scripts/a.ts`]:
      'import pkg from "left-pad";\nimport fs from "node:fs";\nimport { z } from "../../../lib/budget.ts";',
  };
  expectFaults(checkNoPackages(files), [
    [`${P}/skills/setup/scripts/a.ts`, "left-pad"],
  ]);
});

test("a type import of `claude-code` and a `bun:` module pass, and a value import of `claude-code` fails", () => {
  const files = {
    [`${P}/modules/x/rules.ts`]:
      'import type { Args } from "claude-code";\nimport { Database } from "bun:sqlite";',
    [`${P}/modules/y/rules.ts`]: 'import { Engine } from "claude-code";',
  };
  expectFaults(checkNoPackages(files), [
    [`${P}/modules/y/rules.ts`, "claude-code"],
  ]);
});

test("`node:`, `import()`, and a computed `on()` name in the module graph are faults", () => {
  const files = {
    [`${P}/hooks/register.ts`]:
      'import { a } from "../modules/gate/index.ts";\nexport function register(on) {\n  on("tool.check", () => {});\n  on(\n    "tool.call",\n    () => {},\n  );\n  on(EVENT, () => {});\n}',
    [`${P}/modules/gate/index.ts`]:
      'import { b } from "../../kernel/b.ts";\nconst m = await import("./x.ts");',
    [`${P}/kernel/b.ts`]: 'import fs from "node:fs";',
    [`${P}/modules/jev/cli.ts`]: 'import fs from "node:fs";',
  };
  const bad = checkModuleGraph(files);
  expect(bad).toHaveLength(3);
  const names = (file: string, value: string) =>
    bad.some((v) => v.includes(file) && v.includes(value));
  expect(names(`${P}/kernel/b.ts`, "node:fs")).toBe(true);
  expect(names(`${P}/modules/gate/index.ts`, "import()")).toBe(true);
  expect(names(`${P}/hooks/register.ts`, "on()")).toBe(true);
});

test("`bun`, a `bun:` module, and a read of `Bun` in the module graph are faults, and `claude-code` is not", () => {
  const files = {
    [`${P}/hooks/register.ts`]:
      'import type { Engine } from "claude-code";\nimport { $ } from "bun";\nimport { a } from "../kernel/a.ts";',
    [`${P}/kernel/a.ts`]:
      'import { Database } from "bun:sqlite";\nexport const a = Bun.file("x");',
  };
  expectFaults(checkModuleGraph(files), [
    [`${P}/hooks/register.ts`, "bun"],
    [`${P}/kernel/a.ts`, "bun:sqlite"],
    [`${P}/kernel/a.ts`, "Bun"],
  ]);
});

test("the module graph rule also covers the module of an add-on plugin", () => {
  const files = {
    "plugins/claudetto-browser/hooks/register.ts": 'import fs from "node:fs";',
  };
  expectFaults(checkModuleGraph(files), [
    ["plugins/claudetto-browser/hooks/register.ts", "node:fs"],
  ]);
});
