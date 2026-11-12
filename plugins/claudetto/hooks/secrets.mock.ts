import type { EventOf, On } from "claude-code";
import type { Engine } from "claude-code/testing";

import { SCANNER } from "./secrets";

type Run = EventOf["process.run"];

/** The lab's answer to a `betterleaks` call, finding each of `secrets` that the scanned text holds; `secrets.spec.ts` runs the real one. */
export const scanned = (e: Run, secrets: readonly string[] = []) => {
	const text = e.init?.stdin ?? "";
	const found = secrets.filter((secret) => text.includes(secret));
	return e.argv[0] === SCANNER
		? {
				value: {
					exitCode: 0,
					stdout: JSON.stringify(found.map((Secret) => ({ Secret }))),
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			}
		: undefined;
};

/** For a test with no `process.run` hook of its own; one with its own answers `scanned(e)` first. */
export const scanner = (on: On, secrets: readonly string[] = []): void => {
	on("process.run", (_$, e, next) => scanned(e, secrets) ?? next(e));
};

/** A scanner that finds the first group of each match of `rule`, so a rule anchored at a line start matches as the real one does. */
export const ruleScanner = (on: On, rule: RegExp): void => {
	on("process.run", (_$, e, next) => {
		const text = e.init?.stdin ?? "";
		const found = [...text.matchAll(rule)].map((match) => match[1] ?? "");
		return scanned(e, found) ?? next(e);
	});
};

/** The gate's verdict on one Bash command. */
export const bash = ($: Engine, command: string) =>
	$.tool.check({ tool: "Bash", input: { command } });
