import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const hooksFile = join(
	import.meta.dir,
	"..",
	"..",
	"plugins",
	"claudetto",
	"hooks",
	"hooks.json"
);

describe("Stop prompt hook against hand-back (REQ-REPLY-148, issue #96)", () => {
	test("hooks.json holds one Stop prompt hook with the documented fields", async () => {
		// Arrange
		const config: unknown = await Bun.file(hooksFile).json();

		// Act + Assert
		expect(config).toMatchObject({
			hooks: {
				Stop: [
					{
						hooks: [
							{
								type: "prompt",
								model: "claude-haiku-5-5",
								timeout: 30,
								continueOnBlock: true
							}
						]
					}
				]
			}
		});
	});

	test("the prompt reads the hook input, guards the loop, and names both verdicts", async () => {
		// Arrange
		const config: unknown = await Bun.file(hooksFile).json();

		// Act
		const text = JSON.stringify(config);

		// Assert
		expect(text).toMatch(
			/\$ARGUMENTS.*stop_hook_active.*\\"ok\\": true.*last_assistant_message.*\\"ok\\": false.*credentials/u
		);
	});
});
