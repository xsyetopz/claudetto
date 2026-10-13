// The manifest of the slice `search`: one mod handler on `WebSearch`, and the `backend` field of the plugin.
// The handler reads the `backend` option, so it has `configure`, and the generated `register` passes the option to it.

import type { Slice } from "../../../../kernel/slice.ts";
import { keepOptions, onSearch } from "./adapters/mod.ts";

export const slice: Slice = {
  name: "search",
  mod: [
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: true,
        allow:
          "plugins/dotclaude-browser/tests/web-search.test.ts > a call of another tool is not touched",
        text: "plugins/dotclaude-browser/tests/web-search.test.ts > when the read gives no text with exit 0, the built-in `WebSearch` answers",
        block:
          "plugins/dotclaude-browser/tests/web-search.test.ts > with the `cloakbrowser` backend and no binary, the call is denied and no browser starts",
        false:
          "plugins/dotclaude-browser/tests/web-search.test.ts > with the add-on, the result comes from the headless browser",
      },
      filter: { tool: "WebSearch" },
      phase: "answer",
      run: onSearch,
      configure: keepOptions,
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
