// The manifest data of the `dotclaude-lab` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.

export const plugin = {
  name: "dotclaude-lab",
  description:
    "Tools for plugin authors. Runs Claude Code in a sandbox, captures and sizes the requests, writes the JSON Schema of `settings.json`, and compares the eval scores of two plugin folders.",
  keywords: ["sandbox", "capture", "schema", "evals"],
  homepage: "https://github.com/xsyetopz/claudetto/wiki/Lab",
};
