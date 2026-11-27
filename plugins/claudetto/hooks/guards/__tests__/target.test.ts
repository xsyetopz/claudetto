import type { On } from "claude-code";
import { describe, type Engine, expect, test } from "claude-code/testing";

const done = (stdout: string, exitCode = 0) => ({
	value: {
		exitCode,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false
	}
});

/** A `gh` logged in as `me`, administering `my-org`, in a checkout of `here`; core asks on the opening rules. */
const world = (on: On, here?: string) => {
	on("process.run", (_$, e) => {
		const args = e.argv.slice(1).join(" ");
		if (args.startsWith("api user/memberships/orgs")) {
			return done("my-org\n");
		}
		if (args.startsWith("api user")) {
			return done("me\n");
		}
		return here === undefined ? done("", 1) : done(`${here}\n`);
	});
	on("tool.check", () => ({ decision: "ask", rule: "Bash(gh pr create*)" }));
};

const check = ($: Engine, command: string) =>
	$.tool.check({ tool: "Bash", input: { command } });

describe("pull request and issue openings", () => {
	test("a pull request on the login's own repository runs with no prompt", async ($, on) => {
		// Arrange
		world(on, "me");

		// Act
		const verdict = await check($, "gh pr create --title x --body y");

		// Assert
		expect(verdict.decision).toBe("allow");
	});

	test("a --repo in an organization the login administers runs with no prompt", async ($, on) => {
		// Arrange
		world(on, "someone");

		// Act
		const verdict = await check($, "gh pr create --repo my-org/tool --title x");

		// Assert
		expect(verdict.decision).toBe("allow");
	});

	test("a --repo on another owner asks and names the owner", async ($, on) => {
		// Arrange
		world(on, "me");

		// Act
		const verdict = await check($, "gh pr create -R other/project --title x");

		// Assert
		expect(verdict.decision).toBe("ask");
		expect(verdict.reason).toContain("other");
	});

	test("an owner gh cannot name asks", async ($, on) => {
		// Arrange
		world(on);

		// Act
		const verdict = await check($, "gh pr create --title x");

		// Assert
		expect(verdict.decision).toBe("ask");
	});
});
