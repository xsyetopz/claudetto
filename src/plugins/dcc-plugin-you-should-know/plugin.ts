// The manifest data of the `dcc-plugin-you-should-know` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.

export const plugin = {
  name: "dcc-plugin-you-should-know",
  description:
    "Shows one thing that you should know before Claude changes something, in a band above the prompt that does not stop the change. Opt-in. Makes at most one model call per turn: a Haiku call, or a fork of the conversation when the Haiku call gets HTTP 429.",
  keywords: ["notice", "toast", "trade-off", "edge-case", "explain"],
  homepage: "https://github.com/xsyetopz/dotclaude/wiki/You-Should-Know",
};
