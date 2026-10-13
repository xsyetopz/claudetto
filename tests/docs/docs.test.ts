// dotclaude-docs: the marketplace entry and the manifest match `plugin.ts`, and the plugin has no hooks.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { plugin } from "../../src/plugins/dotclaude-docs/plugin.ts";
import { PLUGINS, REPO } from "../support/repo.ts";

const ROOT = path.join(PLUGINS, "dotclaude-docs");
const manifest: { description: string } = await Bun.file(
  path.join(ROOT, ".claude-plugin/plugin.json"),
).json();
const marketplace: {
  plugins: { name: string; source: string; description: string }[];
} = await Bun.file(path.join(REPO, ".claude-plugin/marketplace.json")).json();

test("the generated manifest has the description of plugin.ts", () => {
  expect(manifest.description).toBe(plugin.description);
});

test("the marketplace lists the plugin with the description of plugin.ts", () => {
  const entry = marketplace.plugins.find(
    (p) => p.name === "dotclaude-docs",
  ) as (typeof marketplace.plugins)[number];
  expect(entry.source).toBe("./plugins/dotclaude-docs");
  expect(entry.description).toBe(plugin.description);
});

test("the plugin has no hooks", () => {
  expect(fs.existsSync(path.join(ROOT, "hooks"))).toBe(false);
});
