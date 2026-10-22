// Each JSON file of a kind that `claude-code-docs` has a schema for names that schema in `$schema` (the user, 2026-10-22).
// The URL is the raw file, because the `blob` page of GitHub is HTML, which an editor cannot read as a schema.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "./repo.ts";

const BASE =
  "https://raw.githubusercontent.com/xsyetopz/claude-code-docs/main/schemas/";

/** The schema file for the repository path `file`, or `undefined` for a file of another kind. */
const schemaOf = (file: string): string | undefined => {
  const name = path.basename(file);
  if (name === "marketplace.json") return "claude-code-marketplace.json";
  if (name === "plugin.json" && file.includes(".claude-plugin/"))
    return "claude-code-plugin-manifest.json";
  if (name === "hooks.json" && path.basename(path.dirname(file)) === "hooks")
    return "claude-code-plugin-hooks.json";
  if (name === "settings.json") return "claude-code-settings.json";
  if (name === "managed-settings.json")
    return "claude-code-managed-settings.json";
  if (name === "keybindings.json") return "claude-code-keybindings.json";
  return undefined;
};

const files = [
  ...new Bun.Glob("{.claude-plugin,plugins,tests}/**/*.json").scanSync({
    cwd: REPO,
    dot: true,
  }),
].filter((f) => !f.includes("node_modules/") && schemaOf(f) !== undefined);

test("the files cover the marketplace, the manifests, the hooks, and the settings", () => {
  expect([...new Set(files.map(schemaOf))].sort()).toStrictEqual([
    "claude-code-marketplace.json",
    "claude-code-plugin-hooks.json",
    "claude-code-plugin-manifest.json",
    "claude-code-settings.json",
  ]);
});

for (const file of files)
  test(`\`${file}\` names its schema in \`$schema\``, async () => {
    const json = await Bun.file(path.join(REPO, file)).json();
    expect(json.$schema).toBe(`${BASE}${schemaOf(file)}`);
  });
