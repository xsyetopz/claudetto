import { expect, test } from "claude-code/testing";

import { GATE_MASKED_EXIT, GATE_UNSTOPPED_COMMIT } from "../texts-gate.ts";
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

const UNSTOPPED = [
	"bun test; git commit -m x",
	"bun test\ngit commit -m x",
	"bun test || true; git commit -m x",
	"bun test && echo ok; git commit -m x",
	"set -o pipefail; bun test | tail -3; git commit -m x",
	"for p in a b; do bun test $p; done; git commit -m x",
	"for p in a b; do bun test $p; done && git commit -m x",
	"while read p; do bun test $p || continue; done; git commit -m x",
];

for (const command of UNSTOPPED) {
	test(`denies a commit that a failed check before it does not stop: ${command}`, () => {
		expect(judge(command, NONE)?.reason).toBe(GATE_UNSTOPPED_COMMIT);
	});
}

test("denies a commit after a check piped into `tail` with a `;`", () => {
	expect(decision("bun test | tail -3; git commit -m x")).toBe("deny");
});

const STOPPED = [
	"bun test && git commit -m x",
	"set -e; bun test; git commit -m x",
	"set -euo pipefail\nbun test\ngit commit -m x",
	"bun test || exit 1; git commit -m x",
	"for p in a b; do bun test $p || exit 1; done; git commit -m x",
	"if bun test; then git commit -m x; fi",
	"until bun test; do sleep 1; done; git commit -m x",
	"git status; git commit -m x",
	"bun test; git status",
];

for (const command of STOPPED) {
	test(`passes a commit that a failure stops: ${command}`, () => {
		expect(decision(command)).toBeUndefined();
	});
}

test("the denial says how to stop before the commit", () => {
	expect(GATE_UNSTOPPED_COMMIT).toContain("&&");
	expect(GATE_UNSTOPPED_COMMIT).toContain("set -e");
});

test("the denial says how to keep the check's exit code", () => {
	expect(judge(PIPED_PUSH, NONE)?.reason).toBe(GATE_MASKED_EXIT);
});
