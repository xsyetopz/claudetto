import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { bash, scanner } from "../../secrets.mock";

export interface Earlier {
	command?: string;
	text: string;
	tool?: string;
	isError?: true;
}

/** A lab for the process and ownership rules; `said` holds the person's messages. */
export const lab = (on: On, past: Earlier[] = [], said: string[] = []) => {
	scanner(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("session.id", () => ({ value: "S1" }));
	on("fs.exists", () => ({ value: false }));
	on("session.messages", () => ({
		value: [
			...said.map((text) => ({ role: "user" as const, text, toolUses: [] })),
			{
				role: "assistant",
				text: "",
				toolUses: past.map((p, i) => ({
					tool: p.tool ?? "Bash",
					tool_use_id: `${i}`,
					input: { command: p.command },
					text: p.text,
					...(p.isError && { isError: true }),
				})),
			},
		],
	}));
	on("tool.check", () => ({ decision: "allow" }));
};

export const denied = (
	command: string,
	reason: string,
	past: Earlier[] = [],
) => {
	test(`${command} is denied as not owned`, async ($: Engine, on: On) => {
		lab(on, past);
		const v = await bash($, command);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(reason);
	});
};

const decides =
	(decision: "allow" | "ask", title: string) =>
	(command: string, past: Earlier[] = []) => {
		test(`${command} ${title}`, async ($: Engine, on: On) => {
			lab(on, past);
			const v = await bash($, command);
			expect(v.decision).toBe(decision);
		});
	};

export const allowed = decides("allow", "passes as owned");
export const asks = decides("ask", "keeps asking as not owned");
