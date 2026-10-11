// Test T1: each import rule of design D18 finds the violation that a fixture breaks it with.
// The rules are in `tests/support/import-rules.ts`, and `imports.test.ts` runs them over the repository.

import { expect, test } from "bun:test";
import {
  checkEntries,
  checkFeatures,
  checkLib,
  checkModuleGraph,
  checkNoPackages,
  checkPluginBoundary,
  parseImports,
} from "../support/import-rules.ts";

test("`parseImports` reads static, re-export, side-effect, and dynamic imports, and skips comments", () => {
  const src = [
    '/** @type {import("x").Y} */',
    '// import a from "commented";',
    'import a from "./a.mjs";',
    'import {\n  b,\n} from "../b.mjs";',
    'export * from "node:fs";',
    'import "./side.mjs";',
    'const m = await import("./d.mjs");',
    "const n = import(name);",
  ].join("\n");
  expect(parseImports(src)).toStrictEqual([
    { spec: "./a.mjs", dynamic: false },
    { spec: "../b.mjs", dynamic: false },
    { spec: "node:fs", dynamic: false },
    { spec: "./side.mjs", dynamic: false },
    { spec: "./d.mjs", dynamic: true },
    { spec: null, dynamic: true },
  ]);
});

const P = "plugins/dotclaude";

test("rule 1: lib importing a feature is a violation", () => {
  const files = {
    [`${P}/lib/a.mjs`]: 'import { x } from "../features/guard/rules.ts";',
    [`${P}/lib/b.mjs`]:
      'import { y } from "./a.mjs";\nimport fs from "node:fs";',
    [`${P}/features/guard/rules.ts`]: "export const x = 1;",
  };
  expect(checkLib(files)).toStrictEqual([
    `${P}/lib/a.mjs: lib imports ../features/guard/rules.ts, and lib imports only lib`,
  ]);
});

test("rule 2: a feature importing another feature is a violation", () => {
  const files = {
    [`${P}/features/guard/rules.ts`]:
      'import { x } from "../prompt/data.mjs";\nimport { y } from "../../lib/b.mjs";\nimport { z } from "./own.mjs";',
  };
  expect(checkFeatures(files)).toStrictEqual([
    `${P}/features/guard/rules.ts: feature guard imports ../prompt/data.mjs, outside lib and itself`,
  ]);
});

test("rule 3: a cli imports another feature, and an entry point imports a hook folder", () => {
  const files = {
    [`${P}/features/reads/cli.ts`]:
      'import { x } from "../setup/rules.mjs";\nimport { y } from "../reads/rules.mjs";',
    [`${P}/hooks/register.mjs`]:
      'import { a } from "../features/guard/rules.ts";\nimport { b } from "../features/prompt/data.ts";\nimport { c } from "../lib/budget.ts";\nimport { d } from "../skills/setup/scripts/settings.mjs";',
  };
  expect(checkEntries(files)).toStrictEqual([
    `${P}/features/reads/cli.ts: cli imports ../setup/rules.mjs, another feature`,
    `${P}/hooks/register.mjs: entry point imports ../skills/setup/scripts/settings.mjs, outside lib and features`,
  ]);
});

test("rule 4: an import that leaves its plugin is a violation, for a plugin, `tools`, and `tests`", () => {
  const files = {
    "plugins/dotclaude-jev/hooks/register.mjs":
      'import { a } from "../../dotclaude/lib/budget.ts";\nimport { b } from "../../../tools/limits.ts";\nimport { c } from "../../../tests/support/x.mjs";\nimport { d } from "../features/jev/rules.mjs";',
  };
  expect(checkPluginBoundary(files)).toStrictEqual([
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../dotclaude/lib/budget.ts leaves its plugin",
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../../tools/limits.ts leaves its plugin",
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../../tests/support/x.mjs leaves its plugin",
  ]);
});

test("rule 5: a package import is a violation, and a `node:` import is not", () => {
  const files = {
    [`${P}/skills/setup/scripts/a.mjs`]:
      'import pkg from "left-pad";\nimport fs from "node:fs";\nimport { z } from "../../../lib/budget.ts";',
  };
  expect(checkNoPackages(files)).toStrictEqual([
    `${P}/skills/setup/scripts/a.mjs: bare import left-pad`,
  ]);
});

test("a type import of `claude-code` and a `bun:` module pass, and a value import of `claude-code` fails", () => {
  const files = {
    [`${P}/features/x/rules.ts`]:
      'import type { Args } from "claude-code";\nimport { Database } from "bun:sqlite";',
    [`${P}/features/y/rules.ts`]: 'import { Engine } from "claude-code";',
  };
  expect(checkNoPackages(files)).toStrictEqual([
    `${P}/features/y/rules.ts: bare import claude-code`,
  ]);
});

test("rule 6: `node:`, `import()`, and a computed `on()` name in the module graph are violations", () => {
  const files = {
    [`${P}/hooks/register.mjs`]:
      'import { a } from "../features/guard/rules.ts";\nexport function register(on) {\n  on("tool.check", () => {});\n  on(EVENT, () => {});\n}',
    [`${P}/features/guard/rules.ts`]:
      'import { b } from "../../lib/b.mjs";\nconst m = await import("./x.mjs");',
    [`${P}/lib/b.mjs`]: 'import fs from "node:fs";',
    [`${P}/features/reads/cli.ts`]: 'import fs from "node:fs";',
  };
  const bad = checkModuleGraph(files);
  expect(bad.length).toBe(3);
  expect(
    bad.includes(`${P}/lib/b.mjs: node:fs in the module graph`),
    bad.join("\n"),
  ).toBeTruthy();
  expect(
    bad.includes(`${P}/features/guard/rules.ts: import() in the module graph`),
    bad.join("\n"),
  ).toBeTruthy();
  expect(
    bad.some((v) => v.startsWith(`${P}/hooks/register.mjs: on() event name`)),
  ).toBe(true);
});

test("rule 6: `bun`, a `bun:` module, and a read of `Bun` in the module graph are violations, and `claude-code` is not", () => {
  const files = {
    [`${P}/hooks/register.ts`]:
      'import type { Engine } from "claude-code";\nimport { $ } from "bun";\nimport { a } from "../lib/a.ts";',
    [`${P}/lib/a.ts`]:
      'import { Database } from "bun:sqlite";\nexport const a = Bun.file("x");',
  };
  expect(checkModuleGraph(files)).toStrictEqual([
    `${P}/hooks/register.ts: bun in the module graph`,
    `${P}/lib/a.ts: bun:sqlite in the module graph`,
    `${P}/lib/a.ts: Bun global in the module graph`,
  ]);
});

test("rule 6 also covers the add-on module of the current jev layout", () => {
  const files = {
    "plugins/dotclaude-jev/hooks/register.mjs": 'import fs from "node:fs";',
  };
  expect(checkModuleGraph(files)).toStrictEqual([
    "plugins/dotclaude-jev/hooks/register.mjs: node:fs in the module graph",
  ]);
});
