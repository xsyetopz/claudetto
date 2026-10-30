// A fault is reported, never repaired, so the writer cannot hide a loss by fixing it quietly.

import { AUTO_MODE_LISTS, type AutoModeSnippet, DEFAULTS } from "./automode.ts";

export type FaultRule =
	| "defaults-dropped"
	| "broad-allow"
	| "classify-all-shell"
	| "classifier-model";

export interface Fault {
	readonly rule: FaultRule;
	readonly where: string;
}

/** The env var that moves the classifier model, which stays unset while no measurement exists. */
export const CLASSIFIER_MODEL_ENV = "CLAUDE_CODE_AUTO_MODE_MODEL";

/** Broad allow rules are dropped on entering auto mode, so one in our snippet never takes effect. */
const INTERPRETER = /^(?:bash|sh|zsh|python[0-9.]*)$/;

const WILDCARD_TAIL = /:?\*.*$/s;

const WHITESPACE = /\s+/;

const BASH_RULE = /^Bash\((.*)\)$/s;

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

export const listsWithoutDefaults = (
	snippet: AutoModeSnippet,
): readonly string[] =>
	AUTO_MODE_LISTS.filter((name) => snippet.autoMode[name][0] !== DEFAULTS);

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
