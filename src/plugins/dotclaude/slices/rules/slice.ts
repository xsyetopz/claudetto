// The manifest of the `rules` slice: the user-invoked skill `/rules-creator`.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "rules",
  skills: ["rules-creator"],
} satisfies Slice;
