// The manifest data of the `dotclaude-sessions` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.

export const plugin = {
  name: "dotclaude-sessions",
  description:
    "Measures the start of a Claude Code session by source, and the usage of each run: model calls, context that each call reads again, and skills that a period did not use.",
  keywords: ["sessions", "usage", "measurement", "context"],
  homepage: "https://github.com/xsyetopz/claudetto/wiki/Sessions",
};
