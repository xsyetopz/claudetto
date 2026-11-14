import { expect, test } from "bun:test";
import { join } from "node:path";

import { isRecord } from "../../plugins/claudetto/hooks/tools.ts";

const EVALS = join(import.meta.dir, "../../plugins/claudetto/evals");

const patternOf = async (grader: string) => {
	const text = await Bun.file(join(EVALS, grader)).text();
	const front = Bun.YAML.parse(text.split("---")[1] ?? "");
	return new RegExp(isRecord(front) ? String(front["input_match"]) : "", "u");
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
])("%s sees `%s` after an escaped quote", async (grader, command) => {
	const pattern = await patternOf(grader);

	expect(pattern.test(bash(`echo "start"; ${command}`))).toBe(true);
});
