// The `decide` option and the call of the CLI. Nothing goes to Jev while `TYPESAFE_API_KEY` is not set.

const MODES = ["off", "jev"] as const;

/** `off`: no call. `jev`: Jev answers each `AskUserQuestion` call that it is sure about. */
export type Mode = (typeof MODES)[number];

/** The mode for the `userConfig` values of the plugin. A missing or unknown value is `off`. */
export const modeOf = (options: Readonly<Record<string, unknown>>): Mode =>
  MODES.find((m) => m === options["decide"]) ?? "off";

/** The sensitive option `TYPESAFE_API_KEY`, or `""`. */
export const keyOf = (options: Readonly<Record<string, unknown>>): string => {
  const key = options["TYPESAFE_API_KEY"];
  return typeof key === "string" ? key : "";
};

/** The chosen key (`yes` or `no` for a yes or no question), and its probability from 0 to 1. */
export interface Answer {
  readonly choice: string;
  readonly confidence: number;
}
