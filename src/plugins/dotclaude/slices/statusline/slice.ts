// The manifest of the `statusline` slice: the CLI `dotclaude-statusline`, its segments, and the settings `statusLine` and `subagentStatusLine`.
// The commands hold `<plugin folder>`, which `/dotclaude:setup` replaces with the folder of the installed plugin.
// The `bin/` folder of a plugin is not on the `PATH` of a status line, so the commands name the launcher by its path.

import type { Slice } from "../../../../kernel/slice.ts";
import { REFRESH_SECONDS } from "./limits.ts";
import { SEGMENTS } from "./segments.ts";

export const slice = {
  name: "statusline",
  cli: { bin: "dotclaude-statusline" },
  segments: SEGMENTS,
  settings: {
    statusLine: {
      type: "command",
      command: 'bun --no-env-file "<plugin folder>/bin/dotclaude-statusline"',
      padding: 0,
      refreshInterval: REFRESH_SECONDS,
      hideVimModeIndicator: true,
    },
    subagentStatusLine: {
      type: "command",
      command:
        'bun --no-env-file "<plugin folder>/bin/dotclaude-statusline" --subagent',
    },
  },
} satisfies Slice;
