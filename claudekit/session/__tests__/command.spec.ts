import { afterEach, describe, expect, test } from "bun:test";
import { spawnCommand } from "../command.ts";

const PRINT = [
	"bun",
	"-e",
	"process.stdout.write(process.env.CLAUDE_CODE_DISABLE_CRON ?? 'unset')",
];
const saved = process.env["CLAUDE_CODE_DISABLE_CRON"];

afterEach(() => {
	if (saved === undefined) {
		delete process.env["CLAUDE_CODE_DISABLE_CRON"];
	} else {
		process.env["CLAUDE_CODE_DISABLE_CRON"] = saved;
	}
});

describe("spawnCommand", () => {
	test("a child does not inherit the variables of the session that runs it", async () => {
		process.env["CLAUDE_CODE_DISABLE_CRON"] = "1";

		const ran = await spawnCommand(PRINT, { cwd: "/" });

		expect(ran.stdout).toBe("unset");
	});

	test("a variable the caller passes reaches the child", async () => {
		const ran = await spawnCommand(PRINT, {
			cwd: "/",
			env: { CLAUDE_CODE_DISABLE_CRON: "1" },
		});

		expect(ran.stdout).toBe("1");
	});
});
