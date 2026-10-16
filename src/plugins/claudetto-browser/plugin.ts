// The manifest data of the `claudetto-browser` plugin, and `description.md` holds its description.
// `just generate` writes `plugin.json` from it, and the version from `package.json`.
// The `userConfig` comes from the slices of the plugin, so the `backend` field is in `slices/search/slice.ts`.

export const plugin = {
  name: "claudetto-browser",
  keywords: ["browser", "agent-browser", "cloakbrowser", "web-search"],
  homepage: "https://github.com/xsyetopz/claudetto/wiki/Browser",
};
