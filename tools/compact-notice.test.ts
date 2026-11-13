import { expect, test } from "bun:test";

import { PIN_COMPACT_KEEP } from "../plugins/claudetto/hooks/pre-compact.ts";
import {
	noticeCommand,
	noticeOf,
} from "../plugins/claudetto/hooks/stop-failure.ts";

const run = async (script: string, env: Record<string, string> = {}) => {
	const child = Bun.spawn(
		["bun", `${import.meta.dir}/../plugins/claudetto/hooks/${script}`],
		{
			stdin: new Blob(['{"error":"rate_limit"}']),
			stdout: "pipe",
			env: { ...process.env, ...env, PATH: process.env.PATH ?? "" },
		},
	);
	return {
		out: await new Response(child.stdout).text(),
		code: await child.exited,
	};
};

test("the compaction carries the keep line on stdout", async () => {
	const { out, code } = await run("pre-compact.ts");

	expect(code).toBe(0);
	expect(out.trim()).toBe(PIN_COMPACT_KEEP);
});

test("the keep line names corrections, refusals, and consents", () => {
	expect(PIN_COMPACT_KEEP).toContain("corrections, refusals, and consents");
});

test("a stop error becomes a notice that names the error", () => {
	expect(noticeOf({ error: "rate_limit" })).toBe(
		"Claude stopped on an error: rate_limit",
	);
});

test("the notice command on macOS passes the text as an argument", () => {
	const argv = noticeCommand("darwin", "Claude stopped on an error: x");

	expect(argv[0]).toBe("osascript");
	expect(argv.at(-1)).toBe("Claude stopped on an error: x");
});

test("the notice command elsewhere uses notify-send", () => {
	expect(noticeCommand("linux", "t")).toEqual([
		"notify-send",
		"claudetto",
		"t",
	]);
});

test("the switch off raises no notice", async () => {
	const { out, code } = await run("stop-failure.ts", {
		CLAUDE_PLUGIN_OPTION_NOTIFICATIONSENABLED: "false",
	});

	expect(code).toBe(0);
	expect(out).toBe("");
});
