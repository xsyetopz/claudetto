// The data of the `claudetto` marketplace. `just generate` writes `.claude-plugin/marketplace.json` from it,
// with the description of each plugin from its `plugin.ts`, and the version from `package.json`.

export const marketplace = {
  name: "claudetto",
  owner: { name: "xsyetopz" },
  description:
    "Lists the claudetto plugin and its optional code-graph, browser, docs, sessions, and lab plugins.",
  /** The plugins in the order of the listing. Each name is a folder of `src/plugins/` with a `plugin.ts`. */
  plugins: [
    "claudetto",
    "claudetto-codegraph",
    "claudetto-browser",
    "claudetto-docs",
    "claudetto-sessions",
    "claudetto-lab",
  ],
  category: "productivity",
} as const;
