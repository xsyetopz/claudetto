// Tests of `processRunner` in `plugins/claudetto/kernel/node/process.ts`: the result of a program, and a timeout that bounds the wait.

import { expect, test } from "bun:test";
import { processRunner } from "../../../plugins/claudetto/kernel/node/process.ts";

test("`processRunner` gives the output and the exit code of a program that runs", async () => {
	const out = await processRunner.run("echo", ["core"]);
	expect(out.exitCode).toBe(0);
	expect(out.stdout).toBe("core\n");
	expect(out.timedOut).toBe(false);
});

test("`processRunner` throws for a program that is missing", async () => {
	await expect(
		processRunner.run("claudetto-no-such-program", []),
	).rejects.toThrow();
});

test("`processRunner` returns at the timeout when a grandchild holds the pipe", async () => {
	const start = Date.now();
	const out = await processRunner.run("sh", ["-c", "sleep 5 & wait"], {
		timeout: 200,
	});
	expect(Date.now() - start).toBeLessThan(1000);
	expect(out.timedOut).toBe(true);
});
