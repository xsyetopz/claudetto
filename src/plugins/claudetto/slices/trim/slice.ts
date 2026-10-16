// The manifest of the `trim` slice: the settings and env entries that turn off each built-in part that claudetto removes.
// The settings come from the parts in `domain/removed.ts`, so a part and its switch have one owner.
// The settings merge fails when another slice sets one of these keys to a different value.

import type { Slice } from "../../../../kernel/slice.ts";
import { trimSettings } from "./domain/removed.ts";

export const slice = {
  name: "trim",
  ladder:
    "built-in: settings and env vars, because each removed part has its own switch",
  settings: trimSettings(),
} satisfies Slice;
