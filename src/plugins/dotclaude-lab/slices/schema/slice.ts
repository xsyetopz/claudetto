// The manifest of the `schema` slice: the `dotclaude-schema` CLI, which writes the JSON Schema of `settings.json` and `managed-settings.json` from the installed Claude Code bundle.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "schema",
  cli: { bin: "dotclaude-schema" },
} satisfies Slice;
