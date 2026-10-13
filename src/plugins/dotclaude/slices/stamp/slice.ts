// The manifest of the slice `stamp`: at each session start, a `system` notice with the dotclaude version and the build SHA (P38).
// The notice costs no model token, because the model does not read it, and `dotclaude-sessions` reads it to group sessions by build.

import type { Slice } from "../../../../kernel/slice.ts";
import { onSessionStart } from "./adapters/mod.ts";

const LAB = "plugins/dotclaude/tests/stamp.test.ts";

export const slice = {
  name: "stamp",
  mod: [
    {
      event: "session.start",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a stamp that cannot read the manifest writes no notice and the session starts`,
        text: `${LAB} > a session with an install entry for its root records the entry's SHA`,
      },
      // The filter matches each start, because the mod runtime refuses two `session.start` handlers with no filter.
      filter: { isInteractive: [true, false] },
      phase: "observe",
      run: onSessionStart,
    },
  ],
} satisfies Slice;
