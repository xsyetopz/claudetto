// The manifest data of the `dotclaude` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.

export const plugin = {
  name: "dotclaude",
  description:
    "Adds a lean output style, six role agents, and a status line command. Adds hooks that ask before work on a repo with an AI policy, check edits and `git` calls, bound the context of subagents, and check Markdown line breaks and drift.",
  keywords: ["output-style", "agents", "hooks", "statusline"],
  homepage: "https://github.com/xsyetopz/dotclaude/wiki/Architecture",
};
