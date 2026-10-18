// The manifest of the slice `dry`: the CLI `jscpd-config`, which merges a `jscpd.local.json` and its `extends` chain into `.jscpd.json`, and the skill `dry`.
// The shipped base `assets/jscpd.base.json` has the settings of jscpd, and no code lists a format.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "dry",
  ladder:
    "built-in: a plugin `bin/` command and a skill, because jscpd runs outside a session and the user starts the work",
  cli: { bin: "jscpd-config" },
  skills: ["dry"],
} satisfies Slice;
