// The manifest data of the `dotclaude-browser` plugin. `just generate` writes `plugin.json` from it, and the version from `package.json`.
// The `userConfig` comes from the slices of the plugin, so the `backend` field is in `slices/search/slice.ts`.

export const plugin = {
  name: "dotclaude-browser",
  description:
    "Drives a browser with `agent-browser`, or with CloakBrowser on sites with bot detection. Answers each `WebSearch` call with a search in the headless browser. With the `cloakbrowser` backend, `WebSearch` needs the CloakBrowser binary.",
  keywords: ["browser", "agent-browser", "cloakbrowser", "web-search"],
  homepage: "https://github.com/xsyetopz/claudetto/wiki/Browser",
};
