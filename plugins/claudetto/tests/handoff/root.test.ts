import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { HANDOFF_DIR } from "../../src/blocks/handoff/handoff.ts";
import { said, tailOf } from "./transcript.ts";

const ROOT = "/repo";

/** A shell `cd` moves the working directory and leaves the project root. */
const moved = (on: On): void => {
	on("session.root", () => ({ value: ROOT }));
	on("session.cwd", () => ({ value: "/repo/openspec/changes/x" }));
	on("ui.log", () => ({ value: undefined }));
};

test("writes the handoff under the project root after a shell `cd`", async ($: Engine, on: On) => {
	const paths: string[] = [];
	moved(on);
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: tailOf(
				said("user", "Rename `fetchUser`."),
				said("assistant", "Done."),
			),
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
	on("fs.write", (_$, e) => {
		paths.push(e.path.replaceAll("\\", "/"));
		return { value: undefined };
	});
	on("classic.PreCompact", () => ({}));

	await $.classic.PreCompact({
		trigger: "auto",
		custom_instructions: null,
		transcript_path: "/tmp/transcript.jsonl",
	});

	expect(paths.filter((path) => path.includes(HANDOFF_DIR))).toEqual([
		expect.stringMatching(`^${ROOT}/${HANDOFF_DIR}/handoff-`),
	]);
});

test("reads the handoff folder under the project root after a shell `cd`", async ($: Engine, on: On) => {
	const asked: string[] = [];
	moved(on);
	on("fs.exists", (_$, e) => {
		asked.push(e.path.replaceAll("\\", "/"));
		return { value: false };
	});
	on("classic.SessionStart", () => ({}));

	await $.classic.SessionStart({ source: "resume" });

	expect(asked).toEqual([`${ROOT}/${HANDOFF_DIR}`]);
});
