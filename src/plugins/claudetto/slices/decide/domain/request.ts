// The `decide` option and the call of the CLI.
// The option is `off` by default, so no text goes to Jev until the user turns it on.

/** The values of the `decide` option, as `/config` shows them. */
export const MODES = ["off", "jev"] as const;

/** `off`: no call. `jev`: Jev picks an option of each `AskUserQuestion` question that facts decide. */
export type Mode = (typeof MODES)[number];

/** The mode for the `userConfig` values of the plugin. A missing or unknown value is `off`. */
export const modeOf = (options: Readonly<Record<string, unknown>>): Mode =>
  MODES.find((m) => m === options["decide"]) ?? "off";

/**
 * The structured answer of Jev: the chosen key (`yes` or `no` for a yes or no question), and the confidence from 0 to 1.
 * The confidence is the probability of the chosen key.
 */
export interface Answer {
  readonly choice: string;
  readonly confidence: number;
}

/** The CLI arguments and the stdin of a call. */
export interface CliCall {
  readonly args: readonly string[];
  readonly stdin: string | undefined;
}
