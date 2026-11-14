import { expect, test } from "bun:test";
import { join } from "node:path";

import { isRecord } from "../../plugins/claudetto/hooks/tools.ts";

const EVALS = join(import.meta.dir, "../../plugins/claudetto/evals");

const patternOf = async (grader: string, key = "input_match", flags = "u") => {
	const text = await Bun.file(join(EVALS, grader)).text();
	const front = Bun.YAML.parse(text.split("---")[1] ?? "");
	return new RegExp(isRecord(front) ? String(front[key]) : "", flags);
};

// A tool input reaches the grader as JSON, so each quote in a command arrives escaped.
const bash = (command: string) => JSON.stringify({ command, description: "" });

test("a kill of the saved pid counts when an escaped quote comes before it", async () => {
	const kills = await patternOf("kill-by-saved-pid/graders/kills-by-pid.md");

	expect(
		kills.test(
			bash(
				'pid=$(cat .worker.pid); ps -p "$pid" -o pid,command; kill "$pid"; echo "kill exit: $?"',
			),
		),
	).toBe(true);
});

test.each([
	["kill-by-saved-pid/graders/no-pattern-kill.md", "pkill -f worker"],
	["no-unasked-revert/graders/no-discard.md", "git stash"],
	["no-unasked-revert/graders/no-sweep-commit.md", "git commit -a"],
	["pasted-material-is-context/graders/no-delete-command.md", "rm src/old.ts"],
	["done-needs-exit-code/graders/test-ran.md", "bun test"],
	[
		"test-behaviour-not-wording/graders/test-ran.md",
		"node --test src/slug.test.ts",
	],
])("%s sees `%s` after an escaped quote", async (grader, command) => {
	const pattern = await patternOf(grader);

	expect(pattern.test(bash(`echo "start"; ${command}`))).toBe(true);
});

test("an amend that folds a follow-up fix into the new commit still counts as one new commit", async () => {
	const commits = await patternOf(
		"no-unasked-revert/graders/one-new-commit.md",
		"pattern",
		"gu",
	);
	const reflog = [
		"0000 59b5 Eval <e> 1 +0000\tcommit (initial): Add the label formatter",
		"59b5 7cd5 Eval <e> 2 +0000\tcommit: Spell label prefix as color",
		"7cd5 50d0 Eval <e> 3 +0000\tcommit (amend): Spell label prefix as color",
	].join("\n");

	expect(reflog.match(commits)).toHaveLength(2);
});

test("a `node:test` suite that asserts on what slugify returns counts as calling it", async () => {
	const calls = await patternOf(
		"test-behaviour-not-wording/graders/calls-slugify.md",
		"pattern",
	);
	const suite = [
		'assert.equal(slugify("Hello World"), "hello-world");',
		'assert.equal(slugify("Top 10 Tips"), "top-10-tips");',
		'assert.equal(slugify(""), "");',
	].join("\n");

	expect(calls.test(suite)).toBe(true);
});
