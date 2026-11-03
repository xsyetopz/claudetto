import { describe, expect, test } from "bun:test";
import { screenState } from "../screen.ts";

describe("screenState", () => {
	test("reads the folder trust dialog with its `No, exit` default chosen as one that needs the cursor moved", () => {
		expect(
			screenState(`Quick safety check
 ❯ No, exit
   Yes, I trust this folder
 Enter to confirm`),
		).toBe("trust-move");
	});

	test("reads the folder trust dialog with `Yes, I trust this folder` chosen as one to confirm", () => {
		expect(
			screenState(`Quick safety check
   No, exit
 ❯ Yes, I trust this folder
 Enter to confirm`),
		).toBe("trust");
	});

	test("reads a permission question, which also shows the `❯` of its first choice", () => {
		expect(
			screenState(`Bash command
 Do you want to proceed?
❯ 1. Yes
  2. No`),
		).toBe("asking");
	});

	test("reads a turn that still runs as busy", () => {
		expect(
			screenState(`✻ Reading… (12s · esc to interrupt)
❯ `),
		).toBe("busy");
	});

	test("reads model text that asks a question while its turn runs as busy, not as a permission question", () => {
		expect(
			screenState(`● Do you want to keep the old name? I kept it.
✻ Musing… (3s · thinking)
❯ `),
		).toBe("busy");
	});

	test("reads a spinner that shows no interrupt hint as busy", () => {
		expect(
			screenState(`● Slithering… (19s · ↓ 776 tokens · thinking)
─ claudetto:main ─
❯ `),
		).toBe("busy");
	});

	test("reads a main thread that waits on its background agents as busy, though its turn has ended", () => {
		expect(
			screenState(`✻ Waiting for 4 background agents to finish
─ claudetto:main ─
❯ `),
		).toBe("busy");
	});

	test("reads a finished turn's summary line, which has no running time, as idle", () => {
		expect(
			screenState(`✻ Worked for 1s · done 4:10 PM
─ claudetto:main ─
❯ `),
		).toBe("idle");
	});

	test("reads the input box with no turn running as idle", () => {
		expect(
			screenState(`● Done.

❯
  ⏵⏵ auto mode on`),
		).toBe("idle");
	});

	test("reads a screen before the input box shows as starting", () => {
		expect(screenState("")).toBe("starting");
	});
});
