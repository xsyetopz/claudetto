// Each plugin manifest has the same description as its entry in the marketplace,
// and has the fields that a user sees in a listing.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLUGINS, REPO } from "./repo.ts";

/** The fields of a plugin manifest that the tests read. */
type Manifest = {
  $schema?: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
};

/** The entries of the marketplace that the tests read. */
type Marketplace = { plugins: { name: string; description?: string }[] };

/** The `backend` option of the `claudetto-browser` manifest. */
type BrowserManifest = {
  userConfig: { backend: { options: string[] } };
};

const readJson = async <T>(file: string): Promise<T> =>
  (await Bun.file(file).json()) as T;
const marketplace = await readJson<Marketplace>(
  path.join(REPO, ".claude-plugin", "marketplace.json"),
);
const NAMES = fs
  .readdirSync(PLUGINS)
  .filter((name) =>
    fs.existsSync(path.join(PLUGINS, name, ".claude-plugin", "plugin.json")),
  );

test("the marketplace lists each plugin once", () => {
  const listed = marketplace.plugins.map((p) => p.name).sort();
  expect(listed).toStrictEqual([...NAMES].sort());
});

for (const name of NAMES) {
  const manifest = await readJson<Manifest>(
    path.join(PLUGINS, name, ".claude-plugin", "plugin.json"),
  );

  test(`${name} has the same description in \`plugin.json\` and the marketplace`, () => {
    const entry = marketplace.plugins.find((p) => p.name === name);
    expect(entry, name).toBeTruthy();
    expect(manifest.description).toBeTruthy();
    expect(entry?.description).toBe(manifest.description);
  });

  test(`${name} has \`$schema\`, \`keywords\`, and \`homepage\``, () => {
    expect(manifest.$schema).toMatch(/^https:\/\/.+\.json$/);
    expect(
      Array.isArray(manifest.keywords) && manifest.keywords.length > 0,
      "keywords",
    ).toBeTruthy();
    expect(manifest.homepage).toMatch(
      /^https:\/\/github\.com\/xsyetopz\/claudetto(?:\/|$)/,
    );
  });
}

test("`claudetto-browser` lists the allowed values of `backend`", async () => {
  const manifest = await readJson<BrowserManifest>(
    path.join(PLUGINS, "claudetto-browser", ".claude-plugin", "plugin.json"),
  );
  expect(manifest.userConfig.backend.options).toStrictEqual([
    "agent-browser",
    "cloakbrowser",
  ]);
});
