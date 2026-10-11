// Each plugin manifest has the same description as its entry in the marketplace,
// and has the fields that a user sees in a listing.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, REPO } from "./repo.mjs";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const marketplace = readJson(
  path.join(REPO, ".claude-plugin", "marketplace.json"),
);
const NAMES = fs
  .readdirSync(PLUGINS)
  .filter((name) =>
    fs.existsSync(path.join(PLUGINS, name, ".claude-plugin", "plugin.json")),
  );

test("the marketplace lists each plugin once", () => {
  const listed = marketplace.plugins.map((p) => p.name).sort();
  assert.deepEqual(listed, [...NAMES].sort());
});

for (const name of NAMES) {
  const manifest = readJson(
    path.join(PLUGINS, name, ".claude-plugin", "plugin.json"),
  );

  test(`${name} has the same description in \`plugin.json\` and the marketplace`, () => {
    const entry = marketplace.plugins.find((p) => p.name === name);
    assert.ok(entry, name);
    assert.ok(manifest.description);
    assert.equal(entry.description, manifest.description);
  });

  test(`${name} has \`$schema\`, \`keywords\`, and \`homepage\``, () => {
    assert.match(manifest.$schema, /^https:\/\/.+\.json$/);
    assert.ok(
      Array.isArray(manifest.keywords) && manifest.keywords.length > 0,
      "keywords",
    );
    assert.match(
      manifest.homepage,
      /^https:\/\/github\.com\/xsyetopz\/dotclaude/,
    );
  });
}

test("`dotclaude-browser` lists the allowed values of `backend`", () => {
  const manifest = readJson(
    path.join(PLUGINS, "dotclaude-browser", ".claude-plugin", "plugin.json"),
  );
  assert.deepEqual(manifest.userConfig.backend.options, [
    "agent-browser",
    "cloakbrowser",
  ]);
});
