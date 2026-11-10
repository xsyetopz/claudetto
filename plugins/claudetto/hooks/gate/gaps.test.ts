import { expect, test } from "claude-code/testing";

import { GATE_MASKED_EXIT, GATE_WHOLE_FORMAT } from "../texts-gate.ts";
import { decision, NONE } from "./rules.mock.ts";
import { judge } from "./rules.ts";

const IN_PLACE = [
	"sed --in-place 's/a/b/' src/a.ts",
	"sed --in-place=.bak 's/a/b/' src/a.ts",
	"find src -name '*.ts' -exec sed -i 's/a/b/' {} +",
	"find src -name '*.ts' -execdir perl -pi -e 's/a/b/' {} ';'",
	"xargs sed -i 's/a/b/' < list",
	"xargs -I {} -n 1 sed -i 's/a/b/' {} < list",
];

for (const command of IN_PLACE) {
	test(`an in-place edit behind a flag or a runner is denied: ${command}`, () => {
		expect(decision(command)).toBe("deny");
	});
}

const CHAINED_READS = [
	"cd src && sed -n '1,5p' a.ts",
	"ls; cat src/a.ts",
	"git status && head -20 src/a.ts",
	"cat .just/swift.just | head -0",
	"cat src/a.ts | tail -5",
	"head -40 src/a.ts | less",
	"cat src/a.ts | sed -n '1,5p'",
];

for (const command of CHAINED_READS) {
	test(`a file read inside a chain is sent to Read: ${command}`, () => {
		expect(decision(command)).toBe("deny");
	});
}

const MASKED_CHECKS = [
	"bun run lint 2>&1 | tail -8",
	"just verify | grep -E 'fail|error'",
	"bun test tools/x.test.ts | head -40",
	"CI=1 cargo test 2>&1 | tail",
];

for (const command of MASKED_CHECKS) {
	test(`a check piped into a trimmer without pipefail is denied: ${command}`, () => {
		expect(decision(command)).toBe("deny");
	});
}

test("the masked check denial says how to keep the exit code", () => {
	expect(judge("bun run lint 2>&1 | tail -8", NONE)?.reason).toBe(
		GATE_MASKED_EXIT,
	);
});

const WHOLE_FORMAT = ["bun fmt", "bun fmt .", "bunx prettier --write ."];

for (const command of WHOLE_FORMAT) {
	test(`a formatter writing the whole repo is denied: ${command}`, () => {
		expect(judge(command, NONE)?.reason).toBe(GATE_WHOLE_FORMAT);
	});
}

const KEPT = [
	"set -o pipefail; bun run lint 2>&1 | tail -8",
	"bun run lint > /tmp/lint.log 2>&1; echo $?",
	"git log --oneline | head -5",
	"cat src/a.ts | wc -l",
	"cat src/a.ts | sed 's/a/b/' > /tmp/out.ts",
	"find src -name '*.ts' -exec grep -l x {} +",
	"bun fmt src/a.ts plugins/b.ts",
	"bun fmt --check",
	"bun fmt --staged",
	"bun fmt --changed",
	"bun fmt --stdin-filepath x.ts",
];

for (const command of KEPT) {
	test(`passes ${command}`, () => {
		expect(decision(command)).toBeUndefined();
	});
}
