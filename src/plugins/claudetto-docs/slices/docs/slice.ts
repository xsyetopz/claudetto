// The manifest of the slice `docs`: one skill, `docs`, and no hook. The skill gets the docs of a library with `ctx7`.
// The plugin ships no MCP server, because a plugin server with no `url` logs an error in each session. The wiki gives the `claude mcp add` command for `context7`.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice: Slice = {
  name: "docs",
  ladder:
    "built-in: a plugin skill, because the model starts the lookup and no hook does",
  skills: ["docs"],
};
