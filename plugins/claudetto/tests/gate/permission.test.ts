import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { stoppedText } from "../../src/blocks/gate/denials.ts";
import { GATED_KEYS } from "../../src/blocks/gate/gate.ts";
import { DENY_ROOT, RUN_HINT } from "../../src/blocks/gate/prompts.ts";
import { bareRepo } from "./facts.ts";

type Behavior = string | undefined;

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

const withFacts = (on: On, failing = false): void => {
	bareRepo(on);
	on("session.cwd", () => {
		if (failing) {
			throw new Error("the session could not be read");
		}
		return { value: "/repo" };
	});
	on("env.get", () => ({ value: undefined }));
	on("classic.PermissionRequest", () => ({}));
};

test("a Bash request whose command loses the root folder is denied", async ($: Engine, on: On) => {
	withFacts(on);

	const answer = await $.classic.PermissionRequest({
		tool_name: "Bash",
		tool_input: { command: "rm -rf /" },
	});

	expect(answer.decision?.behavior).toBe("deny");
});

// No allow path for a call nothing settles: an `ask` of our rules passes on untouched.
test("a request the rules only ask about gets no allow", async ($: Engine, on: On) => {
	withFacts(on);

	const answer = await $.classic.PermissionRequest({
		tool_name: "Bash",
		tool_input: { command: "git push --force" },
	});

	expect(answer.decision).toBeUndefined();
});

// `tool.check` carries the gate because `classic.PermissionRequest` does not fire in `claude -p`.
test("the gate denies the same command at tool.check", async ($: Engine, on: On) => {
	withFacts(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
});

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

	// `message` is on the deny branch alone, so narrow it rather than assert.
	const decision = answer.decision;
	if (decision?.behavior !== "deny") {
		throw new Error(`the gate denied nothing: ${JSON.stringify(decision)}`);
	}
	expect(decision.message).toBe(
		stoppedText(`${DENY_ROOT({ target: "/" })}\n${RUN_HINT({ command })}`),
	);
});

// Our gate only tightens: an `allow` over a `deny` beneath would undo the user's rule or mode.
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

// A hook holds writes to code-running files because the classifier does not cover them.
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

// A gate that cannot run holds the call: without the `.catch` the engine's `allow` beneath would stand.
test("a gate that fails holds the call for a person", async ($: Engine, on: On) => {
	withFacts(on, true);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "bun test" },
	});

	expect(verdict.decision).toBe("ask");
});

// A key list, not literals in a condition, so this case can read it.
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
