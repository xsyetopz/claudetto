import { expect, test } from "claude-code/testing";

import { GATE_REF_MOVE } from "../texts-gate.ts";
import { judge } from "./rules.ts";

const NONE = (_file: string) => false;

for (const command of [
	"git fetch -q origin main && git reset --soft FETCH_HEAD",
	"git reset FETCH_HEAD",
	"git reset --soft 8ec2d966",
	"git -C /tmp/r reset --mixed origin/main",
	"git reset --keep release/0.3.0",
	"git update-ref refs/heads/main 8ec2d966",
	"git branch -f main 8ec2d966",
	"git branch --force main HEAD~2",
	"git branch -fM mine main",
	"sh -c 'git reset --soft ORIG_HEAD'",
]) {
	test(`${command} asks and names the hash form`, () => {
		expect(judge(command, NONE)).toEqual({
			decision: "ask",
			reason: GATE_REF_MOVE,
		});
	});
}

for (const command of [
	"git reset",
	"git reset --soft",
	"git reset --soft HEAD~1",
	"git reset --mixed HEAD^",
	"git reset --soft @~2",
	"git reset src/a.ts",
	"git reset -- src/a.ts",
	"git reset HEAD -- src/a.ts",
	"git branch feature",
	"git branch -d old",
	"git rev-parse origin main",
	"echo git reset --soft FETCH_HEAD",
]) {
	test(`${command} passes`, () => {
		expect(judge(command, NONE)).toBeUndefined();
	});
}
