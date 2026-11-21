import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const plugin = join(import.meta.dir, "..", "..", "plugins", "claudetto");
const script = join(plugin, "hooks", "guards", "inplace-deny.sh");
const command = `"\${CLAUDE_PLUGIN_ROOT}/hooks/guards/inplace-deny.sh"`;

describe("in-place edit deny (REQ-GUARDS-079, issue #98)", () => {
	test("the script denies with a reason that names the Edit tool", async () => {
		// Arrange
		const input = JSON.stringify({
			hook_event_name: "PreToolUse",
			tool_name: "Bash",
			tool_input: { command: "sed -i 's/a/b/' src/a.ts" }
		});
		const proc = Bun.spawn(["sh", script], {
			stdin: new Response(input),
			stdout: "pipe"
		});

		// Act
		const out: unknown = await new Response(proc.stdout).json();
		const code = await proc.exited;

		// Assert
		expect(code).toBe(0);
		expect(out).toMatchObject({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny"
			}
		});
		expect(JSON.stringify(out)).toMatch(/Edit tool.*diff/u);
	});

	test("hooks.json runs the script on PreToolUse only behind each in-place rule", async () => {
		// Arrange
		// A leading `*` reaches the command behind `xargs`, `find -exec` and `env`, which the
		// engine's `if` does not strip; `* -i*` reaches a flag placed before `-i`.
		const rules = [
			"Bash(*sed -i*)",
			"Bash(*sed --in-place*)",
			"Bash(*sed -Ei*)",
			"Bash(*sed -ri*)",
			"Bash(*sed * -i*)",
			"Bash(*sed * --in-place*)",
			"Bash(*perl -i*)",
			"Bash(*perl -pi*)",
			"Bash(*perl -0pi*)",
			"Bash(*perl * -i*)",
			"Bash(*perl * -pi*)",
			"Bash(*perl * -0pi*)"
		];

		// Act
		const config: unknown = await Bun.file(
			join(plugin, "hooks", "hooks.json")
		).json();

		// Assert
		expect(config).toMatchObject({
			hooks: {
				PreToolUse: [
					{
						matcher: "Bash",
						hooks: rules.map((rule) => ({ type: "command", if: rule, command }))
					}
				]
			}
		});
	});
});
