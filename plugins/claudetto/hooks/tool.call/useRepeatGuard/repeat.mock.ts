import type { On } from "claude-code";

import { scanned } from "../../secrets.mock";

export const FILE = Array.from(
	{ length: 12 },
	(_, i) => `line ${i + 1} of the file`,
);
export const NUMBERED = FILE.map((line, i) => `     ${i + 1}\t${line}`).join(
	"\n",
);

interface Answer {
	readonly text: string;
	readonly isReadOnly?: true;
	/** The command's own output, when it differs from the text the agent reads. */
	readonly stdout?: string;
}

/** Each `tool.call` answers what `answers` holds for its `tool_use_id`. */
export const lab = (on: On, answers: Record<string, Answer>): void => {
	on(
		"process.run",
		(_$, e) =>
			scanned(e) ?? {
				value: {
					exitCode: 0,
					stdout: "",
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			},
	);
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: false }));
	on("session.cwd", () => ({ value: "/p" }));
	on("session.root", () => ({ value: "/p" }));
	on("session.id", () => ({ value: "S1" }));
	on("session.messages", () => ({ value: [] }));
	on("tool.list", () => ({ value: [] }));
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	on("tool.call", (_$, e) => {
		const answer = answers[e.tool_use_id ?? ""] ?? { text: "" };
		const { stdout = answer.text, ...rest } = answer;
		return { result: { stdout, stderr: "" }, ...rest };
	});
};
