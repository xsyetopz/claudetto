import type { EventOf, On } from "claude-code";
import type { Engine } from "claude-code/testing";
import { SCANNER } from "./secrets.ts";

type Run = EventOf["process.run"];

/** The lab's answer to a `betterleaks` call, finding each of `secrets` that the scanned text holds; `secrets.spec.ts` runs the real one. */
export const scanned = (e: Run, secrets: readonly string[] = []) => {
	if (e.argv[0] !== SCANNER) {
		return;
	}
	const text = String(e.init?.stdin ?? "");
	const found = secrets.filter((secret) => text.includes(secret));
	return {
		value: {
			exitCode: 0,
			stdout: JSON.stringify(found.map((Secret) => ({ Secret }))),
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	};
};

/** For a test with no `process.run` hook of its own; one with its own answers `scanned(e)` first. */
export const scanner = (on: On, secrets: readonly string[] = []): void => {
	on("process.run", (_$, e, next) => scanned(e, secrets) ?? next(e));
};

/** The gate's verdict on one Bash command. */
export const bash = ($: Engine, command: string) =>
	$.tool.check({ tool: "Bash", input: { command } });
