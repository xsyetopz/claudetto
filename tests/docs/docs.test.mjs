// dotclaude-docs: the marketplace entry matches the manifest, and the plugin has no hooks.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, REPO } from "../support/repo.mjs";

const ROOT = path.join(PLUGINS, "dotclaude-docs");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const manifest = JSON.parse(read(".claude-plugin/plugin.json"));
const marketplace = JSON.parse(
  fs.readFileSync(path.join(REPO, ".claude-plugin/marketplace.json"), "utf8"),
);

test("the marketplace lists the plugin with the manifest description", () => {
  const entry = marketplace.plugins.find((p) => p.name === "dotclaude-docs");
  assert.equal(entry.source, "./plugins/dotclaude-docs");
  assert.equal(entry.description, manifest.description);
});

test("the plugin has no hooks", () => {
  assert.equal(fs.existsSync(path.join(ROOT, "hooks")), false);
});
