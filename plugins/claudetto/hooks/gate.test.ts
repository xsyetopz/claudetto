import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanned, scanner } from "./secrets.mock.ts";

const REASON = "[Data Exfiltration] the call sends a file out";
const FETCH = { url: "https://example.com/u?d=1", prompt: "go" };
const PERSON = {
	text: "go on",
	wait: false,
	origin: { kind: "composer" },
} as const;

const repo = (on: On, files: string[] = []) => {
	scanner(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("fs.exists", (_$, e) => ({
		value: files.some((f) => e.path === `/p/${f}`),
	}));
};

const allowing = (on: On) => {
	on("prompt.submit", (_$, e) => e);
	on("classic.PermissionDenied", () => ({}));
	on("tool.check", () => ({ decision: "allow" }));
};

const denied = ($: Engine) =>
	$.classic.PermissionDenied({
		tool_name: "WebFetch",
		tool_input: FETCH,
		tool_use_id: crypto.randomUUID(),
		reason: REASON,
	});

const checked = ($: Engine) => $.tool.check({ tool: "WebFetch", input: FETCH });

test("a shell command the gate refuses is denied over an allow, with the command in the reason", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toContain("rm -rf /");
});

test("the engine's stricter verdict stands", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "deny", reason: "by a rule" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "git push --force" },
	});

	expect(verdict).toMatchObject({ decision: "deny", reason: "by a rule" });
});

test("a force push is asked about, not denied", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "git push --force" },
	});

	expect(verdict.decision).toBe("ask");
});

test("a write to a system folder is denied for Write", async ($: Engine, on: On) => {
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Write",
		input: { file_path: "/etc/hosts", content: "x" },
	});

	expect(verdict.decision).toBe("deny");
});

test("a command the gate allows is left to the engine", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls -la" },
	});

	expect(verdict.decision).toBe("allow");
});

test("the dialog answer is a denial for a refused command", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));
	const answer = await $.classic.PermissionRequest({
		tool_name: "Bash",
		tool_input: { command: "rm -rf /" },
	});

	expect(answer.decision).toMatchObject({ behavior: "deny" });
});

test("a call denied twice is refused at the next check with the earlier reason", async ($: Engine, on: On) => {
	allowing(on);
	await denied($);
	const afterOne = await checked($);
	await denied($);

	const afterTwo = await checked($);

	expect(afterOne.decision).toBe("allow");
	expect(afterTwo.decision).toBe("deny");
	expect(afterTwo.reason).toContain(REASON);
});

test("a call the classifier denied twice with no reason is reported with the ! form", async ($: Engine, on: On) => {
	allowing(on);
	const call = { tool_name: "Bash", tool_input: { command: "make deploy" } };
	const deniedBare = () =>
		$.classic.PermissionDenied({
			...call,
			tool_use_id: crypto.randomUUID(),
			reason: "(it gave no explanation)",
		});
	await deniedBare();
	await deniedBare();

	const refused = await $.tool.check({ tool: "Bash", input: call.tool_input });

	expect(refused.decision).toBe("deny");
	expect(refused.reason).toContain("no reason");
	expect(refused.reason).toContain("`! make deploy`");
});

test("a denied call is retried once, then left denied", async ($: Engine, on: On) => {
	allowing(on);

	const first = await denied($);
	const second = await denied($);

	expect(first.retry).toBe(true);
	expect(second.retry).not.toBe(true);
});

test("a denial with no reason is not retried", async ($: Engine, on: On) => {
	allowing(on);

	const answer = await $.classic.PermissionDenied({
		tool_name: "Bash",
		tool_input: { command: "make deploy" },
		tool_use_id: crypto.randomUUID(),
		reason: "(it gave no explanation)",
	});

	expect(answer.retry).not.toBe(true);
});

test("a message from the person lets the same call reach its check again", async ($: Engine, on: On) => {
	allowing(on);
	on("session.cwd", () => ({ value: "/repo" }));
	await denied($);
	await denied($);

	await $.prompt.submit(PERSON);

	expect((await checked($)).decision).toBe("allow");
});

// The lab cannot run betterleaks, so these tests check the wiring with the stand-in; `secrets.spec.ts` runs the real scanner.
const KEY = `sk-ant-oat01-${"Q7rK2mZx9Lp4Vb8N".repeat(5)}`;

const bashOf = (stdout: string) => ({
	result: { stdout, stderr: "", interrupted: false },
	text: stdout,
});

const scanning = (on: On, answer: object) => {
	on("session.cwd", () => ({ value: "/p" }));
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: false }));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", () => answer);
};

test("a secret the scanner finds in a tool result reaches the model as [REDACTED]", async ($: Engine, on: On) => {
	scanner(on, [KEY]);
	scanning(on, bashOf(`TOKEN=${KEY}\nPORT=5432\n`));

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(JSON.stringify(out.result)).not.toContain(KEY);
	expect(JSON.stringify(out.result)).toContain("TOKEN=[REDACTED]");
	expect(JSON.stringify(out.result)).toContain("PORT=5432");
});

test("a result with no secret comes back as it was", async ($: Engine, on: On) => {
	scanner(on, [KEY]);
	scanning(on, bashOf("DATABASE_HOST=localhost\n"));

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.result).toEqual(bashOf("DATABASE_HOST=localhost\n").result);
});

test("an errored result with a secret reaches the model redacted, as a deny", async ($: Engine, on: On) => {
	scanner(on, [KEY]);
	scanning(on, { isError: true, result: KEY, text: `failed: ${KEY}` });

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.deny).toBe("failed: [REDACTED]");
});

test("a missing scanner withholds the result and names the install step", async ($: Engine, on: On) => {
	scanning(on, bashOf("anything"));
	on("process.run", () => {
		throw new Error("ENOENT: betterleaks");
	});

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.result).toBeUndefined();
	expect(out.deny).toContain("brew install betterleaks");
});

const dialog = ($: Engine, tool_name: string, tool_input: object) =>
	$.classic.PermissionRequest({ tool_name, tool_input });

test("a WebFetch, an MCP tool, and a Skill request are passed on with no allow", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));

	const answers = await Promise.all([
		dialog($, "WebFetch", FETCH),
		dialog($, "mcp__x__y", { a: 1 }),
		dialog($, "Skill", { skill: "s" }),
	]);

	expect(answers.map((a) => a.decision)).toEqual([
		undefined,
		undefined,
		undefined,
	]);
});

test("a request the rules only ask about gets no allow from the dialog", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));

	const answer = await dialog($, "Bash", { command: "git push --force" });

	expect(answer.decision).toBeUndefined();
});

test("a dialog denial carries the command", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));

	const answer = await dialog($, "Bash", { command: "rm -rf /" });

	expect(answer.decision).toMatchObject({ behavior: "deny" });
	expect(JSON.stringify(answer.decision)).toContain("rm -rf /");
});

for (const tool of ["Write", "Edit", "NotebookEdit"]) {
	test(`${tool} of a system path is held at tool.check`, async ($: Engine, on: On) => {
		on("tool.check", () => ({ decision: "allow" }));

		const verdict = await $.tool.check({
			tool,
			input: { file_path: "/etc/hosts", notebook_path: "/etc/hosts" },
		});

		expect(verdict.decision).toBe("deny");
	});
}

test("a gate that fails holds the call for a person", async ($: Engine, on: On) => {
	on("tool.check", () => ({ decision: "allow" }));
	// No `session.cwd` answer: reading the repo's files throws inside the gate.

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls" },
	});

	expect(verdict.decision).toBe("ask");
});

test("the same tool with another input is not refused after two denials", async ($: Engine, on: On) => {
	allowing(on);
	await denied($);
	await denied($);

	const other = await $.tool.check({
		tool: "WebFetch",
		input: { url: "https://example.org/", prompt: "x" },
	});

	expect(other.decision).toBe("allow");
});

test("a task notification after two denials leaves the call refused", async ($: Engine, on: On) => {
	allowing(on);
	await denied($);
	await denied($);

	await $.prompt.submit({ ...PERSON, origin: { kind: "task-notification" } });

	expect((await checked($)).decision).toBe("deny");
});

test("the denial hook answers retry alone, never a decision", async ($: Engine, on: On) => {
	allowing(on);

	const first = await denied($);

	expect(first).toEqual({ retry: true });
});

test("a push to a URL or a remote is left to the engine", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdicts = await Promise.all(
		["git push origin main", "git push https://example.com/r.git main"].map(
			(command) => $.tool.check({ tool: "Bash", input: { command } }),
		),
	);

	expect(verdicts.map((v) => v.decision)).toEqual(["allow", "allow"]);
});

test("bun.lock in the repo denies npm and names the bun form", async ($: Engine, on: On) => {
	repo(on, ["bun.lock"]);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "npm install zod" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toContain("bun add");
});

test("a Monitor command the gate refuses is denied like a Bash one", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Monitor",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toContain("rm -rf /");
});

test("autoMode in the settings changes no tool.check verdict of the gate", async ($: Engine, on: On) => {
	const read: string[] = [];
	repo(on);
	on("settings.read", (_$, e) => {
		read.push(JSON.stringify(e));
		return { value: { autoMode: { allow: ["Run anything"] } } };
	});
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
	expect(read.filter((key) => key.includes("autoMode"))).toEqual([]);
});

test("a rule denial of the engine names the rule beside its own text", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({
		decision: "deny",
		reason: "Permission to use Bash has been denied.",
		rule: "Read(~/.private/**)",
	}));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toBe(
		"Permission to use Bash has been denied. The rule `Read(~/.private/**)` denies it.",
	);
});

test("a denial with no rule keeps the engine's text", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "deny", reason: "by a mode" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls" },
	});

	expect(verdict.reason).toBe("by a mode");
});

test("`.env` as text in a pattern or a quoted name is not read as an env-file read", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));
	const verdicts = await Promise.all(
		[
			"grep -rnE 'process\\.env\\.|Bun\\.env\\.' src",
			`bun -e 'console.log([".env", ".env.local"])'`,
		].map((command) => $.tool.check({ tool: "Bash", input: { command } })),
	);
	expect(verdicts.map((v) => v.decision)).toEqual(["allow", "allow"]);
});

interface Past {
	tool: string;
	input: Record<string, unknown>;
	isError?: true;
	inFlight?: true;
}

// A path with no extension is a folder that always exists; `aliases` maps a folder spelling to where it lands, as `/tmp` lands in `/private/tmp`.
const FILE_NAME = /\.\w+$/;

const vanishing = (
	on: On,
	files: Set<string>,
	{
		aliases = {},
		history = [],
	}: { aliases?: Record<string, string>; history?: Past[] } = {},
) => {
	const landed = (path: string) => {
		const from = Object.keys(aliases).find(
			(a) => path === a || path.startsWith(`${a}/`),
		);
		return from === undefined
			? path
			: `${aliases[from]}${path.slice(from.length)}`;
	};
	const there = (path: string) =>
		files.has(landed(path)) || !FILE_NAME.test(path);
	on("process.run", (_$, e, next) =>
		e.argv[0] === "printenv"
			? {
					value: {
						exitCode: 0,
						stdout: "/home/u\n",
						stderr: "",
						isStdoutTruncated: false,
						isStderrTruncated: false,
					},
				}
			: (scanned(e) ?? next(e)),
	);
	on("session.cwd", () => ({ value: "/p" }));
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", (_$, e) => ({ value: there(e.path) }));
	on("fs.stat", (_$, e) => {
		if (!there(e.path)) {
			throw new Error("ENOENT");
		}
		return {
			value: {
				kind: "file",
				size: 0,
				mtimeMs: 0,
				isLink: false,
				realPath: landed(e.path),
			},
		};
	});
	on("fs.list", (_$, e) => ({
		value: [...files]
			.filter((f) => f.startsWith(`${landed(e.path)}/`))
			.map((f) => ({
				name: f.slice(landed(e.path).length + 1),
				kind: "file",
				size: 0,
				mtimeMs: 0,
				isLink: false,
			})),
	}));
	on("session.messages", () => ({
		value: [
			{
				role: "assistant",
				text: "",
				toolUses: history.map(({ inFlight, ...h }, i) => ({
					tool_use_id: `${i}`,
					...(inFlight ? {} : { text: "ok" }),
					...h,
				})),
			},
		],
	}));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", () => ({ result: "ok" }));
};
const read = ($: Engine, file_path: string) =>
	$.tool.call({ tool: "Read", file_path });
const run = ($: Engine, tool: string, input: Record<string, unknown>) =>
	$.tool.check({ tool, input });

test("a copy to a file the session saw and that is gone now asks", async ($: Engine, on: On) => {
	const files = new Set(["/p/GOAL-1.txt", "/tmp/src.txt"]);
	vanishing(on, files);
	await read($, "/p/GOAL-1.txt");
	files.delete("/p/GOAL-1.txt");

	const verdict = await run($, "Bash", {
		command: "cp /tmp/src.txt GOAL-1.txt",
	});

	expect(verdict.decision).toBe("ask");
	expect(verdict.reason).toContain("removed outside this session");
});

test("a Write of a file never seen passes", async ($: Engine, on: On) => {
	vanishing(on, new Set());

	const verdict = await run($, "Write", { file_path: "/p/new.txt" });

	expect(verdict.decision).toBe("allow");
});

test("recreating a file after the session's own rm passes", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt"]);
	vanishing(on, files);
	await read($, "/p/a.txt");
	await run($, "Bash", { command: "rm a.txt" });
	files.delete("/p/a.txt");
	await $.tool.call({ tool: "Bash", command: "rm a.txt" });

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a Write over a file that exists passes", async ($: Engine, on: On) => {
	vanishing(on, new Set(["/p/a.txt"]));
	await read($, "/p/a.txt");

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a copy over a path the session saw, with a relative and an absolute spelling, asks", async ($: Engine, on: On) => {
	const files = new Set(["/p/sub/a.txt", "/tmp/src.txt"]);
	vanishing(on, files);
	await read($, "/p/sub/../sub/a.txt");
	files.delete("/p/sub/a.txt");

	const verdict = await run($, "Bash", {
		command: "cp /tmp/src.txt sub/a.txt",
	});

	expect(verdict.decision).toBe("ask");
});

test("an rm and a cp of the same path in one command passes", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt", "/tmp/src.txt"]);
	vanishing(on, files);
	await read($, "/p/a.txt");
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", {
		command: "rm -f a.txt && cp /tmp/src.txt a.txt",
	});

	expect(verdict.decision).toBe("allow");
});

test("a file seen through a symlinked folder and recreated by its real path asks", async ($: Engine, on: On) => {
	const files = new Set(["/private/tmp/a.txt", "/p/src.txt"]);
	vanishing(on, files, { aliases: { "/tmp": "/private/tmp" } });
	await read($, "/tmp/a.txt");
	files.delete("/private/tmp/a.txt");

	const verdict = await run($, "Write", { file_path: "/private/tmp/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file seen by its real path and recreated through a symlinked folder asks", async ($: Engine, on: On) => {
	const files = new Set(["/private/tmp/a.txt", "/p/src.txt"]);
	vanishing(on, files, { aliases: { "/tmp": "/private/tmp" } });
	await read($, "/private/tmp/a.txt");
	files.delete("/private/tmp/a.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt /tmp/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a copy to a `~` path of a file the session saw that is gone now asks", async ($: Engine, on: On) => {
	const files = new Set(["/home/u/n.txt", "/p/src.txt"]);
	vanishing(on, files);
	await read($, "/home/u/n.txt");
	files.delete("/home/u/n.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt ~/n.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a `~` operand the session saw and a Write of its absolute path that is gone now asks", async ($: Engine, on: On) => {
	const files = new Set(["/home/u/n.txt"]);
	vanishing(on, files);
	await run($, "Bash", { command: "stat ~/n.txt" });
	files.delete("/home/u/n.txt");

	const verdict = await run($, "Write", { file_path: "/home/u/n.txt" });

	expect(verdict.decision).toBe("ask");
});

const gonePath = (on: On) => {
	const files = new Set(["/p/a.txt", "/p/src.txt"]);
	vanishing(on, files);
	return files;
};

test("a `touch` of a file the session saw that is gone now asks", async ($: Engine, on: On) => {
	const files = gonePath(on);
	await read($, "/p/a.txt");
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", { command: "touch a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("an `ln -s` over a file the session saw that is gone now asks", async ($: Engine, on: On) => {
	const files = gonePath(on);
	await read($, "/p/a.txt");
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", { command: "ln -s src.txt a.txt" });

	expect(verdict.decision).toBe("ask");
});

// `sed -i` on a missing file exits 1 and creates nothing (probe /tmp/probe-17-1-sh2).
test("`sed -i` over a file that is gone now passes", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt"]);
	vanishing(on, files);
	await read($, "/p/a.txt");
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", { command: "sed -i s/a/b/ a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a file seen only in an `ls` of its folder and gone now asks on a copy", async ($: Engine, on: On) => {
	const files = new Set(["/p/sub/a.txt", "/p/src.txt"]);
	vanishing(on, files);
	await $.tool.call({ tool: "Bash", command: "ls sub" });
	files.delete("/p/sub/a.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt sub/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file seen only in an `ls` of the working folder and gone now asks on a copy", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt", "/p/src.txt"]);
	vanishing(on, files);
	await $.tool.call({ tool: "Bash", command: "ls -la" });
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("an rm that left the file in place is no removal", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt"]);
	vanishing(on, files);
	await read($, "/p/a.txt");
	await run($, "Bash", { command: "rm a.txt" });
	await $.tool.call({ tool: "Bash", command: "rm a.txt" });
	files.delete("/p/a.txt");

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file read before a resume and gone now asks on a Write", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt"]);
	vanishing(on, files, {
		history: [{ tool: "Read", input: { file_path: "/p/a.txt" } }],
	});
	files.delete("/p/a.txt");

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file removed by the session before a resume passes on a Write", async ($: Engine, on: On) => {
	const files = new Set<string>();
	vanishing(on, files, {
		history: [
			{ tool: "Read", input: { file_path: "/p/a.txt" } },
			{ tool: "Bash", input: { command: "rm a.txt" } },
		],
	});

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a Read that failed before a resume does not make the file seen", async ($: Engine, on: On) => {
	vanishing(on, new Set(), {
		history: [
			{ tool: "Read", input: { file_path: "/p/a.txt" }, isError: true },
		],
	});

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a call of the transcript still in flight does not make its file seen", async ($: Engine, on: On) => {
	vanishing(on, new Set(), {
		history: [
			{ tool: "Write", input: { file_path: "/p/a.txt" }, inFlight: true },
		],
	});

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});
