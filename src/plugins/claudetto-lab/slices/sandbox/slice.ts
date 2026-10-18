import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "sandbox",
  ladder:
    "built-in: a plugin `bin/` command, because the sandbox runs outside a session",
  cli: { bin: "claudetto-sandbox" },
} satisfies Slice;
