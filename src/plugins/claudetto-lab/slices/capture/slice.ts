// The manifest of the `capture` slice: the `claudetto-capture` CLI, a logging proxy for the requests of Claude Code.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "capture",
  ladder:
    "built-in: a plugin `bin/` command, because the proxy runs outside a session",
  cli: { bin: "claudetto-capture" },
} satisfies Slice;
