import { launchArm } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/ab/session.ts";
import type { Arm } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/arm/arm.ts";
import { DEFAULT_MODEL } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/shared/model.ts";
const native = process.argv[2] === "on";
const arm: Arm = {
	name: "nest",
	plugins: [],
	settings: {
		permissions: { allow: ["Bash"] },
		sandbox: { enabled: native, allowUnsandboxedCommands: true },
	},
	env: { CLAUDE_CODE_SHELL_PREFIX: "/tmp/probe-nest-s/prefix.sh" },
	model: DEFAULT_MODEL,
	expect: { plugins: [], model: DEFAULT_MODEL },
};
const { run, result } = await launchArm(
	arm,
	{ name: "n", prompt: "go" },
	{
		probe: "sbx-nest",
		plan: {
			steps: [
				{
					reply: {
						blocks: [
							{
								type: "tool_use",
								name: "Bash",
								input: { command: "echo plain-ran" },
							},
						],
						stop: "tool_use",
					},
				},
				{
					reply: {
						blocks: [
							{
								type: "tool_use",
								name: "Bash",
								input: {
									command: "echo disabled-ran",
									dangerouslyDisableSandbox: true,
								},
							},
						],
						stop: "tool_use",
					},
				},
			],
			fallback: { blocks: [{ type: "text", text: "Done." }] },
		},
		launch: { mode: "stream-json", persist: false },
	},
);
console.log(run.dir);
