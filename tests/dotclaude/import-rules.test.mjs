// Test T1: each import rule of design D18 finds the violation that a fixture breaks it with.
// The rules are in `tests/support/import-rules.mjs`, and `imports.test.mjs` runs them over the repository.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkEntries,
  checkFeatures,
  checkLib,
  checkModuleGraph,
  checkNoPackages,
  checkPluginBoundary,
  parseImports,
} from "../support/import-rules.mjs";

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
  assert.deepEqual(parseImports(src), [
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
    [`${P}/lib/a.mjs`]: 'import { x } from "../features/guard/rules.mjs";',
    [`${P}/lib/b.mjs`]:
      'import { y } from "./a.mjs";\nimport fs from "node:fs";',
    [`${P}/features/guard/rules.mjs`]: "export const x = 1;",
  };
  assert.deepEqual(checkLib(files), [
    `${P}/lib/a.mjs: lib imports ../features/guard/rules.mjs, and lib imports only lib`,
  ]);
});

test("rule 2: a feature importing another feature is a violation", () => {
  const files = {
    [`${P}/features/guard/rules.mjs`]:
      'import { x } from "../prompt/data.mjs";\nimport { y } from "../../lib/b.mjs";\nimport { z } from "./own.mjs";',
  };
  assert.deepEqual(checkFeatures(files), [
    `${P}/features/guard/rules.mjs: feature guard imports ../prompt/data.mjs, outside lib and itself`,
  ]);
});

test("rule 3: a cli imports another feature, and an entry point imports a hook folder", () => {
  const files = {
    [`${P}/features/reads/cli.mjs`]:
      'import { x } from "../setup/rules.mjs";\nimport { y } from "../reads/rules.mjs";',
    [`${P}/hooks/register.mjs`]:
      'import { a } from "../features/guard/rules.mjs";\nimport { b } from "../features/prompt/data.mjs";\nimport { c } from "../lib/budget.mjs";\nimport { d } from "../skills/setup/scripts/settings.mjs";',
  };
  assert.deepEqual(checkEntries(files), [
    `${P}/features/reads/cli.mjs: cli imports ../setup/rules.mjs, another feature`,
    `${P}/hooks/register.mjs: entry point imports ../skills/setup/scripts/settings.mjs, outside lib and features`,
  ]);
});

test("rule 4: an import that leaves its plugin is a violation, for a plugin, `tools`, and `tests`", () => {
  const files = {
    "plugins/dotclaude-jev/hooks/register.mjs":
      'import { a } from "../../dotclaude/lib/budget.mjs";\nimport { b } from "../../../tools/limits.mjs";\nimport { c } from "../../../tests/support/x.mjs";\nimport { d } from "../features/jev/rules.mjs";',
  };
  assert.deepEqual(checkPluginBoundary(files), [
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../dotclaude/lib/budget.mjs leaves its plugin",
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../../tools/limits.mjs leaves its plugin",
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../../tests/support/x.mjs leaves its plugin",
  ]);
});

test("rule 5: a package import is a violation, and a `node:` import is not", () => {
  const files = {
    [`${P}/skills/setup/scripts/a.mjs`]:
      'import pkg from "left-pad";\nimport fs from "node:fs";\nimport { z } from "../../../lib/budget.mjs";',
  };
  assert.deepEqual(checkNoPackages(files), [
    `${P}/skills/setup/scripts/a.mjs: bare import left-pad`,
  ]);
});

test("rule 6: `node:`, `import()`, and a computed `on()` name in the module graph are violations", () => {
  const files = {
    [`${P}/hooks/register.mjs`]:
      'import { a } from "../features/guard/rules.mjs";\nexport function register(on) {\n  on("tool.check", () => {});\n  on(EVENT, () => {});\n}',
    [`${P}/features/guard/rules.mjs`]:
      'import { b } from "../../lib/b.mjs";\nconst m = await import("./x.mjs");',
    [`${P}/lib/b.mjs`]: 'import fs from "node:fs";',
    [`${P}/features/reads/cli.mjs`]: 'import fs from "node:fs";',
  };
  const bad = checkModuleGraph(files);
  assert.equal(bad.length, 3);
  assert.ok(
    bad.includes(`${P}/lib/b.mjs: node:fs in the module graph`),
    bad.join("\n"),
  );
  assert.ok(
    bad.includes(`${P}/features/guard/rules.mjs: import() in the module graph`),
    bad,
  );
  assert.equal(
    bad.some((v) => v.startsWith(`${P}/hooks/register.mjs: on() event name`)),
    true,
  );
});

test("rule 6 also covers the add-on module of the current jev layout", () => {
  const files = {
    "plugins/dotclaude-jev/hooks/register.mjs": 'import fs from "node:fs";',
  };
  assert.deepEqual(checkModuleGraph(files), [
    "plugins/dotclaude-jev/hooks/register.mjs: node:fs in the module graph",
  ]);
});
