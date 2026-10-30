// The checks of an `autoMode` snippet that may not ship. A fault is reported, never repaired, so the
// writer cannot hide a loss by fixing it quietly.

import { AUTO_MODE_LISTS, type AutoModeSnippet, DEFAULTS } from "./automode.ts";

/** The four faults that keep an `autoMode` snippet from shipping: a list without `DEFAULTS`, a broad allow rule, `classifyAllShell` set, and a classifier model set. */
export type FaultRule =
	| "defaults-dropped"
	| "broad-allow"
	| "classify-all-shell"
	| "classifier-model";

/** One finding of `autoModeFaults`; an empty result means the snippet may be written. */
export interface Fault {
	readonly rule: FaultRule;
	/** The list, rule, or key the fault is in. */
	readonly where: string;
}

/** The env var that moves the classifier model, which stays absent while no measurement exists. */
export const CLASSIFIER_MODEL_ENV = "CLAUDE_CODE_AUTO_MODE_MODEL";

/**
 * Source for the broad-rule fault: `permission-modes` on `code.claude.com`, read for `2.1.312`, the
 * page `specs/low-hitl/spec.md`, "Use Narrow Allow Rules" cites. It says: "On entering auto mode,
 * broad allow rules that grant arbitrary code execution are dropped: Blanket `Bash(*)` or
 * `PowerShell(*)`, Wildcarded interpreters like `Bash(python*)`, Package-manager run commands,
 * `Agent` allow rules, `Monitor` allow rules", and "Narrow rules like `Bash(npm test)` stay in
 * effect." So a broad rule in our snippet is a rule that never takes effect, which is the silent
 * loss this fault reports. No `clawdipedia` page carries this behavior.
 *
 * Checked here: `Bash(*)` and a wildcard over an interpreter. The page names `python*`; `bash`, `sh`
 * and `zsh` are the same interpreter class, and the task names `Bash(bash:*)` and `Bash(sh:*)`.
 * Not checked here: `PowerShell(*)`, package-manager run commands, `Agent` and `Monitor`, because
 * setup writes no rule of those shapes. A fault is reported and never repaired, so a rule of one of
 * those shapes would have to be added with its own check.
 */
const INTERPRETER = /^(?:bash|sh|zsh|python[0-9.]*)$/;

const WILDCARD_TAIL = /:?\*.*$/s;

const WHITESPACE = /\s+/;

const BASH_RULE = /^Bash\((.*)\)$/s;

/** True when the allow rule is `Bash(*)` or a wildcard over an interpreter. */
export const isBroadAllow = (rule: string): boolean => {
	const inner = BASH_RULE.exec(rule.trim())?.[1]?.trim();
	if (inner === undefined) {
		return false;
	}
	if (inner === "*" || inner === ":*") {
		return true;
	}
	if (!inner.includes("*")) {
		return false;
	}
	const program =
		inner.replace(WILDCARD_TAIL, "").trim().split(WHITESPACE)[0] ?? "";
	return INTERPRETER.test(program);
};

/** The lists that do not start with `DEFAULTS`, in the order of `AUTO_MODE_LISTS`. */
export const listsWithoutDefaults = (
	snippet: AutoModeSnippet,
): readonly string[] =>
	AUTO_MODE_LISTS.filter((name) => snippet.autoMode[name][0] !== DEFAULTS);

/** The rules of the `allow` list that `isBroadAllow` flags, in list order. `autoModeFaults` reports each as a `broad-allow` fault. */
export const broadAllowRules = (snippet: AutoModeSnippet): readonly string[] =>
	snippet.autoMode.allow.filter(isBroadAllow);

const shellFaults = (snippet: AutoModeSnippet): readonly Fault[] =>
	snippet.autoMode.classifyAllShell === true
		? [{ rule: "classify-all-shell", where: "classifyAllShell" }]
		: [];

const modelFaults = (snippet: AutoModeSnippet): readonly Fault[] =>
	CLASSIFIER_MODEL_ENV in snippet.env
		? [{ rule: "classifier-model", where: CLASSIFIER_MODEL_ENV }]
		: [];

/** Every fault of a snippet. An empty list is a snippet that may be written. */
export const autoModeFaults = (snippet: AutoModeSnippet): readonly Fault[] => [
	...listsWithoutDefaults(snippet).map(
		(where): Fault => ({ rule: "defaults-dropped", where }),
	),
	...broadAllowRules(snippet).map(
		(where): Fault => ({ rule: "broad-allow", where }),
	),
	...shellFaults(snippet),
	...modelFaults(snippet),
];
