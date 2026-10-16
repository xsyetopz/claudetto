// The manifest of the slice `usercheck`: the hooks `classic.PermissionDenied` and `classic.Stop`.
// A denied call can leave a check that only the user can run.
// The `Stop` hook then asks Claude for the exact `!` command, so that the user can run the check.

import type { Slice } from "../../../../kernel/slice.ts";
import { onPermissionDenied, onStop } from "./adapters/mod.ts";

export const slice = {
  name: "usercheck",
  ladder:
    "mod: the `classic.PermissionDenied` and `classic.Stop` hooks, because no mod event reports a denial",
  mod: [
    {
      event: "classic.PermissionDenied",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/claudetto/tests/usercheck.test.ts > with no denied call, the stop passes",
        text: "plugins/claudetto/tests/usercheck.test.ts > after a denied call, a reply with no `!` command gets one block that names the call",
      },
      phase: "observe",
      run: onPermissionDenied,
    },
    {
      event: "classic.Stop",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: true,
        allow:
          "plugins/claudetto/tests/usercheck.test.ts > after a denied call, a reply with a `!` command passes",
        text: "plugins/claudetto/tests/usercheck.test.ts > after a denied call, a reply with no `!` command gets one block that names the call",
        block:
          "plugins/claudetto/tests/usercheck.test.ts > after a denied call, a reply with no `!` command gets one block that names the call",
        false:
          "plugins/claudetto/tests/usercheck.test.ts > a stop after a block passes, so the block comes one time",
      },
      phase: "check",
      run: onStop,
    },
  ],
} satisfies Slice;
