// The arms differ in the classifier alone: the agent is the same scripted fake in each, and only a
// classifier request reaches the upstream.

import { isClassifier, systemTexts } from "../../../claudekit/api/match.ts";
import {
	claudeArgv,
	inlinePluginOptions,
	NO_SESSION_PERSISTENCE,
	outputFormat,
	type Part,
	permissionMode,
	pluginDir,
	print,
	settingSources,
	settings,
} from "../../../claudekit/session/argv.ts";
import { baseUrlEnv, QUIET_ENV } from "../../../claudekit/session/env.ts";
import { suiteSnippet } from "../../../plugins/claudetto/src/automode/rules.ts";
import { classifierRules } from "../../../plugins/claudetto/src/blocks/classify/prompt.ts";

/** The built-in classifier, the claudetto rule suite in its place, and the claudetto hook on each model. */
export const CLASSIFIER_ARMS = [
	"built-in",
	"suite",
	"haiku",
	"sonnet",
] as const;

/** One arm of the classifier A/B. */
export type ClassifierArm = (typeof CLASSIFIER_ARMS)[number];

/** Whether `value` names an arm, for the `--arm` flag. */
export const isClassifierArm = (value: string): value is ClassifierArm =>
	CLASSIFIER_ARMS.some((arm) => arm === value);

const armParts = (arm: ClassifierArm, dir: string): readonly Part[] => {
	if (arm === "built-in") {
		return [];
	}
	if (arm === "suite") {
		return [settings({ autoMode: suiteSnippet().autoMode })];
	}
	return [pluginDir(dir), settings(inlinePluginOptions({ classifier: arm }))];
};

/** `--setting-sources project,local` keeps the login's own plugins and rules out of every arm. */
export const classifierArgv = (
	arm: ClassifierArm,
	prompt: string,
	dir: string,
): readonly string[] =>
	claudeArgv(
		print(prompt),
		outputFormat("json"),
		NO_SESSION_PERSISTENCE,
		settingSources("project", "local"),
		permissionMode("auto"),
		...armParts(arm, dir),
	);

/**
 * `CLAUDE_CODE_AUTO_MODE_SERVER=0` keeps the built-in classifier in the client, where its requests can be
 * forwarded and read. An empty `TYPESAFE_API_KEY` keeps Jev out, so the hook arms measure the model alone.
 */
export const classifierEnv = (baseUrl: string): Record<string, string> => ({
	...baseUrlEnv(baseUrl),
	CLAUDE_CODE_AUTO_MODE_SERVER: "0",
	TYPESAFE_API_KEY: "",
	...QUIET_ENV,
});

/** The built-in classifier by its opening, and the claudetto hook by its whole rule text. */
export const isClassifierRequest = (body: unknown): boolean => {
	const rules = classifierRules();
	return (
		isClassifier(JSON.stringify(body)) ||
		systemTexts(body).some((text) => text === rules)
	);
};
