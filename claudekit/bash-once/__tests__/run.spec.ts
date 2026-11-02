import { describe, expect, test } from "bun:test";
import { which } from "bun";
import { runBashOnce } from "../run.ts";

const hasClaude = which("claude") !== null;

// The run starts the real `claude -p` against the local fake API, so it needs the binary and no key.
describe.skipIf(!hasClaude)("runBashOnce", () => {
	test("returns the output of an allowed `Bash` command", async () => {
		const out = await runBashOnce({
			command: "echo hi",
			settings: { permissions: { allow: ["Bash"] } },
		});

		expect(out).toContain("hi");
	}, 120_000);

	test("returns the denial of a command that a `deny` rule matches", async () => {
		const out = await runBashOnce({
			command: "echo hi",
			settings: { permissions: { allow: ["Bash"], deny: ["Bash(echo:*)"] } },
		});

		expect(out).not.toBe("hi");
		expect(out.toLowerCase()).toContain("permission");
	}, 120_000);
});
