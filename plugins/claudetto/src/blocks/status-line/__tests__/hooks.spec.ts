import { expect, test } from "bun:test";
import {
	deniedText,
	deniesSetupAgent,
	SETUP_AGENT_DENY,
	unreadableText,
} from "../hooks.ts";

const FILE = "/home/u/.claude/settings.json";

test("a deny list holding the `statusline-setup` rule denies the agent", () => {
	expect(
		deniesSetupAgent({
			permissions: { deny: ["Bash(rm:*)", SETUP_AGENT_DENY] },
		}),
	).toBe(true);
});

test.each([
	["no `permissions`", {}],
	["no `deny`", { permissions: {} }],
	["a `deny` without the rule", { permissions: { deny: ["Agent(Explore)"] } }],
	["a `deny` that is no list", { permissions: { deny: SETUP_AGENT_DENY } }],
	["`permissions` that is no object", { permissions: "deny" }],
] as const)("%s leaves the agent allowed", (_case, settings) => {
	expect(deniesSetupAgent(settings)).toBe(false);
});

test("the denied answer names the file, the rule, and the key it sits in", () => {
	const text = deniedText(FILE);

	expect(text).toContain(FILE);
	expect(text).toContain(`\`${SETUP_AGENT_DENY}\``);
	expect(text).toContain("`permissions.deny`");
});

test("the unreadable answer names the file to fix", () => {
	expect(unreadableText(FILE)).toContain(FILE);
});
