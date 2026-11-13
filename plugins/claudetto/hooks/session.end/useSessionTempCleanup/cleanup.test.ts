import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

const folder = (name: string) => ({
	name,
	kind: "dir" as const,
	size: 0,
	mtimeMs: 0,
	isLink: false,
});

/** `tree` maps a folder to its entries; a folder not in it is absent. `removed` collects each argv that `rm` got. */
const lab = (
	on: On,
	tree: Record<string, string[]>,
	env: Record<string, string> = {},
	failure?: string,
) => {
	const removed: (readonly string[])[] = [];
	const logs: string[] = [];
	mock.env(on, env);
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	on("ui.log", (_$, e) => {
		logs.push(e.text);
		return { value: undefined };
	});
	on("fs.list", (_$, e) => {
		const entries = tree[e.path];
		return entries === undefined
			? { deny: `ENOENT: ${e.path}` }
			: { value: entries.map((name) => folder(name)) };
	});
	on("process.run", (_$, e) => {
		if (failure !== undefined) {
			return { deny: failure };
		}
		removed.push(e.argv);
		return { value: ok };
	});
	return { removed, logs };
};

const end = ($: Engine, sessionId: string) =>
	$.session.end({ reason: "other", sessionId, resume: { id: sessionId } });

test("the ending session's temp folder is removed, and a folder of another session stays", async ($: Engine, on: On) => {
	const { removed } = lab(on, {
		"/tmp": ["claude-501", "other"],
		"/tmp/claude-501": ["-Users-me-proj", "bash-edit-diff"],
		"/tmp/claude-501/-Users-me-proj": ["s-1", "s-2"],
	});

	await end($, "s-1");

	expect(removed).toEqual([
		["rm", "-rf", "/tmp/claude-501/-Users-me-proj/s-1"],
	]);
});

test("each temp base is searched, and a base that is absent is skipped without a log line", async ($: Engine, on: On) => {
	const { removed, logs } = lab(
		on,
		{
			"/var/t": ["claude-501"],
			"/var/t/claude-501": ["-a", "-b"],
			"/var/t/claude-501/-a": ["s-1"],
			"/var/t/claude-501/-b": ["s-1"],
			"/tmp": [],
		},
		{ CLAUDE_CODE_TMPDIR: "/var/t", TMPDIR: "/missing" },
	);

	await end($, "s-1");

	expect(removed).toEqual([
		["rm", "-rf", "/var/t/claude-501/-a/s-1", "/var/t/claude-501/-b/s-1"],
	]);
	expect(logs).toEqual([]);
});

test("a session with no temp folder starts no process", async ($: Engine, on: On) => {
	const { removed } = lab(on, {
		"/tmp": ["claude-501"],
		"/tmp/claude-501": ["-Users-me-proj"],
		"/tmp/claude-501/-Users-me-proj": ["s-2"],
	});

	await end($, "s-1");

	expect(removed).toEqual([]);
});

test(
	"hygieneEnabled false removes nothing",
	{ options: { hygieneEnabled: false } },
	async ($: Engine, on: On) => {
		const { removed } = lab(on, {
			"/tmp": ["claude-501"],
			"/tmp/claude-501": ["-p"],
			"/tmp/claude-501/-p": ["s-1"],
		});

		await end($, "s-1");

		expect(removed).toEqual([]);
	},
);

test("a failed removal is logged and the session still ends", async ($: Engine, on: On) => {
	const { logs } = lab(
		on,
		{
			"/tmp": ["claude-501"],
			"/tmp/claude-501": ["-p"],
			"/tmp/claude-501/-p": ["s-1"],
		},
		{},
		"rm failed",
	);

	const out = await end($, "s-1");

	expect(out).toEqual({ sessionId: "s-1" });
	expect(logs.some((line) => line.includes("rm failed"))).toBe(true);
});
