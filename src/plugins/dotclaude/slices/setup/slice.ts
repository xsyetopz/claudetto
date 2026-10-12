// The manifest of the `setup` slice: the user-invoked skill `/setup`, the CLI `dotclaude-setup`,
// and the drift check at `session.start`.

import type { Slice } from "../../../../kernel/slice.ts";
import { onSessionStart } from "./adapters/mod.ts";

export const slice = {
  name: "setup",
  mod: [{ event: "session.start", phase: "observe", run: onSessionStart }],
  cli: { bin: "dotclaude-setup" },
  skills: ["setup"],
} satisfies Slice;
