// The options of the slice: which advisor, and the model and the effort of `advise`.

import type { ModelEffort } from "claude-code";

/** The values of the `advisor` option. `builtin`: the slice registers no tool. */
export const ADVISORS = ["builtin", "claudetto"] as const;

const EFFORTS: readonly ModelEffort[] = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export type Options = {
  readonly advisor: (typeof ADVISORS)[number];
  readonly model: string;
  readonly effort: ModelEffort;
};

/** The options for the `userConfig` values of the plugin. A missing or unknown value is the default. */
export const optionsOf = (
  values: Readonly<Record<string, unknown>>,
): Options => ({
  advisor: values["advisor"] === "claudetto" ? "claudetto" : "builtin",
  model:
    typeof values["advisorModel"] === "string" && values["advisorModel"]
      ? values["advisorModel"]
      : "opus",
  effort: EFFORTS.find((e) => e === values["advisorEffort"]) ?? "high",
});
