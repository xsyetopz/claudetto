// The manifest data of the `dotclaude-codegraph` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.

export const plugin = {
  name: "dotclaude-codegraph",
  description:
    "Gives Claude the code graph of a project from the CodeGraph CLI `codegraph`. Syncs the index at session start, after an edit, and after a `git` command that changes the tree. Adds one line about the graph commands at session start.",
  keywords: ["codegraph", "code-graph", "search", "index"],
  homepage: "https://github.com/xsyetopz/dotclaude/wiki/Code-Graph",
};
