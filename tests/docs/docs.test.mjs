// dotclaude-docs: the listing entry is short, the marketplace entry matches the manifest, and the plugin has no hooks.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "../../plugins/dotclaude-docs");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const skill = read("skills/docs/SKILL.md");
const manifest = JSON.parse(read(".claude-plugin/plugin.json"));
const marketplace = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "../../.claude-plugin/marketplace.json"),
    "utf8",
  ),
);

test("the skill listing entry has 100 characters or fewer", () => {
  const description = skill.match(/^description: (.+)$/m)[1];
  expect(description.length).toBeLessThanOrEqual(100);
});

test("the marketplace lists the plugin last with the manifest description", () => {
  const entry = marketplace.plugins.at(-1);
  expect(entry.name).toBe("dotclaude-docs");
  expect(entry.source).toBe("./plugins/dotclaude-docs");
  expect(entry.description).toBe(manifest.description);
});

test("the plugin has no hooks", () => {
  expect(fs.existsSync(path.join(ROOT, "hooks"))).toBe(false);
});
