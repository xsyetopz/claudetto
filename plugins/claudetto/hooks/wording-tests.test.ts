import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { WORDING_TEST } from "./texts.ts";

const SHIPPED = "the gate holds this call";
const lab = (on: On) => {
	on("session.cwd", () => ({ value: "/repo" }));
	on("tool.check", () => ({ decision: "allow" }));
	on("process.run", (_$, e) => ({
		value: {
			exitCode: e.argv.includes(SHIPPED) ? 0 : 1,
			stdout: e.argv.includes(SHIPPED) ? "hooks/texts.ts\n" : "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
};
const edit = ($: Engine, file_path: string, phrase: string) =>
	$.tool.check({
		tool: "Edit",
		input: {
			file_path,
			old_string: "x",
			new_string: `expect(r.reason).toContain("${phrase}");`,
		},
	});

test("a test edit that asserts on wording a source file ships is denied", async ($: Engine, on: On) => {
	lab(on);
	const r = await edit($, "/repo/hooks/gate.test.ts", SHIPPED);
	expect(r.decision).toBe("deny");
	expect(r.reason).toBe(WORDING_TEST(SHIPPED, "hooks/texts.ts"));
});

test("a test edit that asserts on a phrase no source file ships passes", async ($: Engine, on: On) => {
	lab(on);
	const r = await edit(
		$,
		"/repo/hooks/gate.test.ts",
		"a phrase only fixtures hold",
	);
	expect(r.decision).not.toBe("deny");
});

test("a source edit holding the same phrase passes", async ($: Engine, on: On) => {
	lab(on);
	const r = await edit($, "/repo/hooks/gate.ts", SHIPPED);
	expect(r.decision).not.toBe("deny");
});
