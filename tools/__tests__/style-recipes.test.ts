import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const styleFile = join(
	import.meta.dir,
	"..",
	"..",
	"plugins",
	"claudetto",
	"output-styles",
	"claudetto.md"
);

describe("output style holds no Bash recipes (REQ-TOOLS-031, issue #115)", () => {
	test("the background-command and perl recipes live in the Bash description", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		expect(style).not.toContain("run_in_background");
		expect(style).not.toContain("perl -pi -e");
		expect(style).not.toContain("pipefail");
	});
});
