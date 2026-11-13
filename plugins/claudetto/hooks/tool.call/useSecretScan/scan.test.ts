import type { On, ToolCallResult } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { ruleScanner, scanner } from "../../secrets.mock";

// The lab cannot run betterleaks, so the tests check the wiring with the stand-in; `secrets.spec.ts` runs the real scanner.
const KEY = `sk-ant-oat01-${"Q7rK2mZx9Lp4Vb8N".repeat(5)}`;

const bashOf = (stdout: string) => ({
	result: { stdout, stderr: "", interrupted: false },
	text: stdout,
});

const scanning = (on: On, answer: ToolCallResult) => {
	on("session.cwd", () => ({ value: "/p" }));
	on("session.root", () => ({ value: "/p" }));
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

test("a secret after a line break in a result with no text reaches the model as [REDACTED]", async ($: Engine, on: On) => {
	ruleScanner(on, /^export API_TOKEN=(\S+)/gmu);
	// The lab engine redacts a key of a known shape on its own, so the token has none.
	scanning(on, { result: { stdout: "ok\nexport API_TOKEN=plain7c3e9a41\n" } });

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.result).toEqual({ stdout: "ok\nexport API_TOKEN=[REDACTED]\n" });
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

test("a missing scanner withholds the result, because unscanned text may hold a secret", async ($: Engine, on: On) => {
	scanning(on, bashOf(KEY));
	on("process.run", () => {
		throw new Error("ENOENT: betterleaks");
	});

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.deny).toContain("withheld");
	expect(JSON.stringify(out)).not.toContain(KEY);
});
