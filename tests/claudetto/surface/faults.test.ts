// The fault tests of the parts that claudetto ships (task 2.1 of change `0-3-0`, spec `lean-surface`).
// Each test names its fault of `.claudetto/0.3.0-findings.md` ("fault N") or `research/sessions.md` ("F N"),
// and it failed on `v0.2.0` (`test.failing`).
// The task that fixes a fault changes its `test.failing` to `test`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLUGINS, REPO, walk } from "../../support/repo.ts";

const CORE = path.join(PLUGINS, "claudetto");
const at = (...parts: string[]) => fs.existsSync(path.join(REPO, ...parts));

// Fixed by task 3.1.
test("faults 18, 46, and 47: the marketplace lists no `claudetto-codegraph`", async () => {
  const market = await Bun.file(
    path.join(REPO, ".claude-plugin/marketplace.json"),
  ).json();
  const names = market.plugins.map((p: { name: string }) => p.name);
  expect(names).not.toContain("claudetto-codegraph");
  expect(at("plugins/claudetto-codegraph")).toBe(false);
});

// Fixed by task 3.2.
test("fault 32 and D6: the core plugin ships no `advise` tool and no `patch` skill", () => {
  expect(at("plugins/claudetto/slices/advise")).toBe(false);
  expect(at("plugins/claudetto/skills/patch")).toBe(false);
  expect(at("plugins/claudetto/bin/claudetto-patch")).toBe(false);
});

// Fixed by task 3.2.
test("fault 24: no control records `none recorded`", async () => {
  const page = await Bun.file(
    path.join(REPO, "wiki/claudetto/rationale/Controls.md"),
  ).text();
  expect(page).not.toContain("none recorded");
});

// Fixed by task 3.5.
test("fault 27: the lint step bounds the cognitive complexity at 15", async () => {
  const biome = await Bun.file(path.join(REPO, "biome.json")).json();
  const rule = biome.linter.rules.complexity?.noExcessiveCognitiveComplexity;
  expect(rule?.options?.maxAllowedComplexity).toBe(15);
});

// Fixed by task 3.3: 10,623 lines of `.ts` in `src/plugins/claudetto/` on `v0.2.0`, with the lab tests.
// The count of the shipped folder also holds the copy of the kernel, so it is a stricter bound.
test("prd goal 4: the core plugin has fewer lines of TypeScript than 0.2.0", async () => {
  const files = walk(CORE, { skip: ["node_modules", "types"] }).filter((f) =>
    f.endsWith(".ts"),
  );
  const texts = await Promise.all(files.map((f) => Bun.file(f).text()));
  const lines = texts.reduce((n, t) => n + t.split("\n").length - 1, 0);
  expect(lines).toBeLessThan(10_623);
});
