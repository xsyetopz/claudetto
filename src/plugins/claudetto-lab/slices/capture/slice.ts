import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "capture",
  ladder:
    "built-in: a plugin `bin/` command, because the proxy runs outside a session",
  cli: { bin: "claudetto-capture" },
} satisfies Slice;
