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

/** The key of Jev with the option `decide` set to `jev`: the option `TYPESAFE_API_KEY`, else the exported `TYPESAFE_API_KEY` of 0.3.0-alpha.1 that `env` reads. Each `$.env.get` call needs a literal name, so the caller gives `env`. */
export const jevKey = async (
	options: Readonly<Record<string, unknown>>,
	env: () => Promise<string | undefined>,
): Promise<string | undefined> =>
	modeOf(options) === "jev" ? keyOf(options) || (await env()) : undefined;

/** The chosen key (`yes` or `no` for a yes or no question), and its probability from 0 to 1. */
export interface Answer {
	readonly choice: string;
	readonly confidence: number;
}
