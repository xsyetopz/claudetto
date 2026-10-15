// The manifest data of the `dcc-plugin-agents-md` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.

export const plugin = {
  name: "dcc-plugin-agents-md",
  description:
    "Loads `AGENTS.md` files where Claude Code loads `CLAUDE.md`: the user folder, each ancestor of the working directory, nested folders on each read or edit, and the folders of `permissions.additionalDirectories`. Skips a file that a `CLAUDE` file already loads.",
  keywords: ["agents-md", "agents", "instructions", "claude-md", "memory"],
  homepage: "https://github.com/xsyetopz/claudetto/wiki/Agents-Md",
};
