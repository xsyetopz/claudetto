// The words of a `claude` command line, one small part for each flag. A part is a list of words, and
// `claudeArgv` joins parts in the order given, so a probe names the flags it wants and nothing else.

/** The words of one flag and its value, or of a bare flag. */
export type Part = readonly string[];

/** The key of this tree's plugin in `pluginConfigs` when `--plugin-dir` loads it. */
export const INLINE_PLUGIN = "claudetto@inline";

/** `claude` followed by `parts` in order. */
export const claudeArgv = (...parts: readonly Part[]): string[] => [
	"claude",
	...parts.flat(),
];

/** The prompt of a non-interactive run. */
export const print = (prompt: string): Part => ["-p", prompt];

/** The model of the session. */
export const model = (id: string): Part => ["--model", id];

/** The permission mode, such as `acceptEdits`. */
export const permissionMode = (mode: string): Part => [
	"--permission-mode",
	mode,
];

/** The spend cap of the session in dollars; it is a word, so a caller may pass `"1.20"` and keep its zero. */
export const maxBudget = (usd: number | string): Part => [
	"--max-budget-usd",
	String(usd),
];

/** The output format. `stream-json` adds `--verbose`, which `-p` requires of it. */
export const outputFormat = (format: "json" | "stream-json" | "text"): Part =>
	format === "stream-json"
		? ["--output-format", format, "--verbose"]
		: ["--output-format", format];

/** Leaves the session out of the transcript store, so the run can be neither resumed nor listed. */
export const NO_SESSION_PERSISTENCE: Part = ["--no-session-persistence"];

/** The settings sources to read, such as `project` and `local`, which leaves the user's own settings out. */
export const settingSources = (...sources: readonly string[]): Part => [
	"--setting-sources",
	sources.join(","),
];

/** Loads the plugin folder `dir` for this session only. */
export const pluginDir = (dir: string): Part => ["--plugin-dir", dir];

/** The tools the session may use without a prompt. */
export const allowedTools = (rules: string): Part => ["--allowedTools", rules];

/** Selects the agent that runs the session. */
export const agent = (name: string): Part => ["--agent", name];

/** The `--settings` flag with `object` as inline JSON, which ranks above the user's settings file. */
export const settings = (object: object): Part => [
	"--settings",
	JSON.stringify(object),
];

/** The `pluginConfigs` key that sets the options of the inline plugin, to merge into the object given to `settings`. */
export const inlinePluginOptions = (
	options: Readonly<Record<string, string>>,
): { pluginConfigs: Record<string, { options: Record<string, string> }> } => ({
	pluginConfigs: { [INLINE_PLUGIN]: { options: { ...options } } },
});
