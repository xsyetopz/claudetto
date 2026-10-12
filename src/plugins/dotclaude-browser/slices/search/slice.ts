// The manifest of the slice `search`: one mod handler on `WebSearch`, and the `backend` field of the plugin.
// The handler reads the `backend` option, so it has `configure`, and the generated `register` passes the option to it.

import type { Slice } from "../../../../kernel/slice.ts";
import { onSearch } from "./adapters/mod.ts";

export const slice: Slice = {
  name: "search",
  mod: [
    {
      event: "tool.call",
      filter: { tool: "WebSearch" },
      phase: "answer",
      configure: onSearch,
    },
  ],
  userConfig: {
    backend: {
      type: "string",
      title: "Browser backend",
      description:
        "Use `agent-browser`, or `cloakbrowser` for sites with bot detection. CloakBrowser runs through `agent-browser` with its own Chromium binary. With `cloakbrowser`, `WebSearch` needs that binary.",
      default: "agent-browser",
      options: ["agent-browser", "cloakbrowser"],
    },
  },
};
