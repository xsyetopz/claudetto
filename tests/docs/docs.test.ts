// dotclaude-docs: the marketplace entry matches the manifest, and the plugin has no hooks.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLUGINS, REPO } from "../support/repo.ts";

const ROOT = path.join(PLUGINS, "dotclaude-docs");
const manifest: { description: string } = await Bun.file(
  path.join(ROOT, ".claude-plugin/plugin.json"),
).json();
const marketplace: {
  plugins: { name: string; source: string; description: string }[];
} = await Bun.file(path.join(REPO, ".claude-plugin/marketplace.json")).json();

test("the marketplace lists the plugin with the manifest description", () => {
  const entry = marketplace.plugins.find(
    (p) => p.name === "dotclaude-docs",
  ) as (typeof marketplace.plugins)[number];
  expect(entry.source).toBe("./plugins/dotclaude-docs");
  expect(entry.description).toBe(manifest.description);
});

test("the plugin has no hooks", () => {
  expect(fs.existsSync(path.join(ROOT, "hooks"))).toBe(false);
});
