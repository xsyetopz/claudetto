// The dialog path of the gate: `classic.PermissionRequest`. A request whose input holds no key the
// gate reads is passed on with no `allow`, so the person is asked (`specs/permission-policy/spec.md`,
// "Fail Closed"). The three inputs below are the kinds that carry no gated key, and none of them carries a
// gated key: `WebFetch` takes `url` and `prompt`, an MCP tool takes whatever its server declares,
// and `Skill` takes `skill` and `args`, read from the tool's own schema.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { stoppedText } from "../src/gate/denials.ts";
import { GATED_KEYS } from "../src/gate/gate.ts";
import { DENY_ROOT, RUN_HINT } from "../src/gate/prompts.ts";

/** What the hook answered, which is `undefined` for an answer that carries no decision at all. */
type Behavior = string | undefined;

/** The engine's own answer to the request, which carries no decision until a hook adds one. */
const lab = (on: On): void => {
	on("classic.PermissionRequest", () => ({}));
};

const asked = async (
	$: Engine,
	tool: string,
	input: Record<string, unknown>,
): Promise<Behavior> => {
	const answer = await $.classic.PermissionRequest({
		tool_name: tool,
		tool_input: input,
	});
	return answer.decision?.behavior;
};

test("a WebFetch request is passed on with no allow", async ($: Engine, on: On) => {
	lab(on);

	const behavior = await asked($, "WebFetch", {
		url: "https://example.com/page",
		prompt: "What does it say?",
	});

	expect(behavior).toBeUndefined();
});

test("a request for an MCP tool is passed on with no allow", async ($: Engine, on: On) => {
	lab(on);

	const behavior = await asked($, "mcp__notes__search", { query: "handoff" });

	expect(behavior).toBeUndefined();
});

test("a Skill request is passed on with no allow", async ($: Engine, on: On) => {
	lab(on);

	const behavior = await asked($, "Skill", {
		skill: "claudetto:apply",
		args: "claudetto-restart",
	});

	expect(behavior).toBeUndefined();
});

/**
 * The gated half: the facts of the session, so that the rules can run over a real command. Nothing
 * here is read for the three cases above, because an ungated request never reaches the facts.
 */
const withFacts = (on: On, failing = false): void => {
	mock.clock(on, { now: 0 });
	mock.store(on);
	on("session.cwd", () => {
		if (failing) {
			throw new Error("the session could not be read");
		}
		return { value: "/repo" };
	});
	on("session.root", () => ({ value: "/repo" }));
	on("env.get", () => ({ value: undefined }));
	on("process.run", () => ({
		value: {
			exitCode: 1,
			stdout: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
	on("fs.exists", () => ({ value: false }));
	on("fs.read", () => ({ value: "" }));
	on("classic.PermissionRequest", () => ({}));
};

// The other half of the rule: the gate answers a request whose input it did read. A `Bash` call
// carries `command`, which is a gated key, and `rm -rf /` is one of the forms the port measured as a
// `deny` (`design.md:79`).
test("a Bash request whose command loses the root folder is denied", async ($: Engine, on: On) => {
	withFacts(on);

	const answer = await $.classic.PermissionRequest({
		tool_name: "Bash",
		tool_input: { command: "rm -rf /" },
	});

	expect(answer.decision?.behavior).toBe("deny");
});

// No allow path for a call that nothing settles (`W5-13`): no classifier is in this tree,
// and an `ask` of our own rules is passed on untouched, so nothing of claudetto's can turn a call it
// could not decide into an approval. The command is one of the forms the rules measure as an `ask`.
test("a request the rules only ask about gets no allow", async ($: Engine, on: On) => {
	withFacts(on);

	const answer = await $.classic.PermissionRequest({
		tool_name: "Bash",
		tool_input: { command: "git push --force" },
	});

	expect(answer.decision).toBeUndefined();
});

// `tool.check` is the path that carries the gate, because `classic.PermissionRequest` does not fire
// in `claude -p` and fires in auto mode only on the fallback to a dialog (`design.md:96`). The same
// command that the dialog path denies is denied here.
test("the gate denies the same command at tool.check", async ($: Engine, on: On) => {
	withFacts(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
});

// A denial of the gate itself tells the model to stop and report, with the rule that denied the
// call (`specs/permission-policy/spec.md`, "Denied Calls Stop"). The answer holds the rule's text
// and the stop text of `stoppedText`, so it is longer than the rule alone.
test("a call the gate denies carries the stop text and the rule at tool.check", async ($: Engine, on: On) => {
	withFacts(on);
	on("tool.check", () => ({ decision: "allow" }));
	const command = "rm -rf /";
	const rule = DENY_ROOT({ target: "/" });

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toBe(stoppedText(`${rule}\n${RUN_HINT({ command })}`));
});

test("a call the gate denies carries the stop text and the rule at the dialog", async ($: Engine, on: On) => {
	withFacts(on);

	const command = "rm -rf /";

	const answer = await $.classic.PermissionRequest({
		tool_name: "Bash",
		tool_input: { command },
	});

	// `message` is on the deny branch of `PermissionRequestDecision` alone, so the branch is narrowed
	// rather than asserted: an `allow` answer fails here with what it was instead.
	const decision = answer.decision;
	if (decision?.behavior !== "deny") {
		throw new Error(`the gate denied nothing: ${JSON.stringify(decision)}`);
	}
	expect(decision.message).toBe(
		stoppedText(`${DENY_ROOT({ target: "/" })}\n${RUN_HINT({ command })}`),
	);
});

// Our gate only ever tightens. A `tool.check` hook may answer in either direction and the last word
// up the chain stands, so an `allow` of ours over a `deny` beneath would undo a deny rule or a mode
// the user set. The command is one the rules find nothing against.
test("a verdict of the engine is not loosened by the gate", async ($: Engine, on: On) => {
	withFacts(on);
	on("tool.check", () => ({
		decision: "deny",
		reason: "Denied by a permission rule",
	}));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "bun test" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toBe("Denied by a permission rule");
});

// A write to a file that runs code or sets a permission is held by the hook and not left
// to the classifier, which an independent evaluation found does not cover in-project file edits. The
// engine's answer beneath is `allow`, which is what `acceptEdits` and an auto mode allow rule both
// give for a file write, so the ask is ours and holds whatever the mode would have done. Each case
// reads the path back out of the reason, so that the hold cannot be the `.catch` of a failed gate.
const PROTECTED = [
	{ tool: "Write", path: "/repo/.github/workflows/ci.yml", key: "content" },
	{ tool: "Edit", path: "/repo/.git/hooks/pre-commit", key: "new_string" },
	{ tool: "Write", path: "/repo/.claude/settings.json", key: "content" },
] as const;

for (const { tool, path, key } of PROTECTED) {
	test(`${tool} of ${path} is held at tool.check`, async ($: Engine, on: On) => {
		withFacts(on);
		on("tool.check", () => ({ decision: "allow" }));

		const verdict = await $.tool.check({
			tool,
			input: { file_path: path, [key]: "echo hi" },
		});

		expect(verdict.decision).toBe("ask");
		expect(verdict.reason).toContain(path);
	});
}

// The other half of that rule: a gate that cannot run holds the call instead of letting it by. The
// facts throw here, which is what a failed `$` read does, and the answer is the `.catch` of the
// registration: without one a failed hook is simply absent and the engine's `allow` beneath would
// stand. An `ask` a hook made is a person's by the contract of `ToolCheckResult`, so no classifier
// allow settles it, and where nobody can be asked it is a deny.
test("a gate that fails holds the call for a person", async ($: Engine, on: On) => {
	withFacts(on, true);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "bun test" },
	});

	expect(verdict.decision).toBe("ask");
});

// The keys are a list and not a set of literals inside a condition, so that this case can read them:
// a new key would gate a tool that no rule of ours reads, which is the open gate the spec forbids.
test("the gated keys are the six the gate reads and no more", () => {
	expect([...GATED_KEYS]).toEqual([
		"command",
		"file_path",
		"notebook_path",
		"path",
		"pattern",
		"glob",
	]);
});
