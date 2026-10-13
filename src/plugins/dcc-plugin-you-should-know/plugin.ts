// The manifest data of the `dcc-plugin-you-should-know` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.

export const plugin = {
  name: "dcc-plugin-you-should-know",
  description:
    "Shows one thing that you should know before Claude changes something, as a toast that does not stop the change. Opt-in. Makes at most one model call per turn: a Haiku call with an API key, and a fork of the conversation on a subscription.",
  keywords: ["notice", "toast", "trade-off", "edge-case", "explain"],
  homepage: "https://github.com/xsyetopz/dotclaude/wiki/You-Should-Know",
};
