import { expect, test } from "claude-code/testing";

import { GATE_MASKED_EXIT } from "../texts-gate.ts";
import { decision, NONE } from "./rules.mock.ts";
import { judge } from "./rules.ts";

const PIPED_PUSH =
	"bun run check 2>&1 | tail -5 && git commit -m x && git push";

const MASKED = [
	PIPED_PUSH,
	"bun test | grep fail; git push origin main",
	"just verify | tail -3 && git -C . commit -am x",
];

for (const command of MASKED) {
	test(`denies a commit or push behind a pipe without pipefail: ${command}`, () => {
		expect(decision(command)).toBe("deny");
	});
}

const KEPT = [
	"set -o pipefail; bun run check | tail -5 && git commit -m x",
	"set -euo pipefail && just verify | tail -3 && git push",
	"bun run check && git commit -m x",
	"git log | head -3",
	"git commit -m x && git log --oneline | head -1",
];

for (const command of KEPT) {
	test(`passes ${command}`, () => {
		expect(decision(command)).toBeUndefined();
	});
}

test("the denial says how to keep the check's exit code", () => {
	expect(judge(PIPED_PUSH, NONE)?.reason).toBe(GATE_MASKED_EXIT);
});
