import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { bash, scanner } from "../secrets.mock.ts";

export interface Earlier {
	command?: string;
	text: string;
	tool?: string;
	isError?: true;
}

/** A lab for the process and ownership rules; `marked` maps a path to the content of the file there. */
export const lab = (
	on: On,
	past: Earlier[] = [],
	marked: Record<string, string> = {},
	said: string[] = [],
) => {
	scanner(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("session.id", () => ({ value: "S1" }));
	on("fs.exists", (_$, e) => ({
		value: Object.keys(marked).some(
			(k) => k === e.path || k.startsWith(`${e.path}/`),
		),
	}));
	on("fs.read", (_$, e) => ({ value: marked[e.path] ?? "" }));
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

export const MARK = "/tmp/mine/.created-by-claudetto";

export const denied = (
	command: string,
	reason: string,
	past: Earlier[] = [],
	marked: Record<string, string> = {},
) => {
	test(`${command} is denied as not owned`, async ($: Engine, on: On) => {
		lab(on, past, marked);
		const v = await bash($, command);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(reason);
	});
};

export const allowed = (
	command: string,
	past: Earlier[] = [],
	marked: Record<string, string> = {},
) => {
	test(`${command} passes as owned`, async ($: Engine, on: On) => {
		lab(on, past, marked);
		const v = await bash($, command);
		expect(v.decision).toBe("allow");
	});
};

export const asks = (command: string, past: Earlier[] = []) => {
	test(`${command} keeps asking as not owned`, async ($: Engine, on: On) => {
		lab(on, past);
		const v = await bash($, command);
		expect(v.decision).toBe("ask");
	});
};
