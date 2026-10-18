// The manifest of the slice `search`: one mod handler on `WebSearch`, and the `backend` field of the plugin.
// The handler reads the `backend` option, so it has `configure`, and the generated `register` passes the option to it.

import type { Slice } from "../../../../kernel/slice.ts";
import { keepOptions, onSearch } from "./adapters/mod.ts";
import { OPTION_DESCRIPTION } from "./prompts.ts";

export const slice: Slice = {
  name: "search",
  ladder: "mod: the `tool.call` hook",
  controls: [
    {
      name: "CloakBrowser search",
      incident:
        "The default browser search took about 7 seconds and each search engine blocked it (`CHANGELOG.md`).",
      removeWhen: "A search engine serves a browser search with no block.",
    },
    {
      name: "search permission gate",
      incident: "none recorded",
      removeWhen:
        "The mod API runs the `WebSearch` permission rules before this hook.",
    },
  ],
  mod: [
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: true,
        allow:
          "plugins/claudetto-browser/tests/web-search.test.ts > a call of another tool is not touched",
        text: "plugins/claudetto-browser/tests/web-search.test.ts > when the read gives no text with exit 0, the built-in `WebSearch` answers",
        block:
          "plugins/claudetto-browser/tests/web-search.test.ts > with the `cloakbrowser` backend and no binary, the call is denied and no browser starts",
        false:
          "plugins/claudetto-browser/tests/web-search.test.ts > with the `cloakbrowser` backend, the result comes from CloakBrowser",
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
      description: OPTION_DESCRIPTION,
      default: "agent-browser",
      options: ["agent-browser", "cloakbrowser"],
    },
  },
};
