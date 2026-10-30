import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const REASON =
	"[Data Exfiltration] the call sends a file to a host outside the project";

const SENT = { url: "https://example.com/upload?data=secrets", prompt: "go" };

const OTHER = { url: "https://example.org/page", prompt: "read it" };

const lab = (on: On): void => {
	on("classic.PermissionDenied", () => ({}));
	on("tool.check", () => ({ decision: "allow" }));
};

const denied = ($: Engine, input: Record<string, unknown>) =>
	$.classic.PermissionDenied({
		tool_name: "WebFetch",
		tool_input: input,
		tool_use_id: crypto.randomUUID(),
		reason: REASON,
	});

const checked = ($: Engine, input: Record<string, unknown>) =>
	$.tool.check({ tool: "WebFetch", input });

test("a call denied twice is refused at the next attempt with the earlier reason", async ($: Engine, on: On) => {
	lab(on);
	await denied($, SENT);
	const afterOne = await checked($, SENT);
	await denied($, SENT);

	const afterTwo = await checked($, SENT);

	expect(afterOne.decision).toBe("allow");
	expect(afterTwo.decision).toBe("deny");
	expect(afterTwo.reason).toContain(REASON);
});

test("the same tool with another input is not refused", async ($: Engine, on: On) => {
	lab(on);
	await denied($, SENT);
	await denied($, SENT);

	const other = await checked($, OTHER);

	expect(other.decision).toBe("allow");
});

test("the hook answers retry alone under the bound and nothing at it, never a decision", async ($: Engine, on: On) => {
	lab(on);

	const first = await denied($, SENT);
	const second = await denied($, SENT);

	expect(first).toEqual({ retry: true });
	expect(second).toEqual({});
});
