import { describe, expect, test } from "bun:test";
import { parseArgs } from "../args.ts";

describe("parseArgs", () => {
	test("defaults to 24 hours and a real run", () => {
		expect(parseArgs([])).toEqual({ hours: 24, dryRun: false });
	});

	test("reads `--hours` and `--dry-run`", () => {
		expect(parseArgs(["--hours", "0", "--dry-run"])).toEqual({
			hours: 0,
			dryRun: true,
		});
	});

	test("rejects a bad `--hours` value and an unknown word", () => {
		expect(() => parseArgs(["--hours"])).toThrow("`--hours`");
		expect(() => parseArgs(["--hours", "-1"])).toThrow("`--hours`");
		expect(() => parseArgs(["--hours", "x"])).toThrow("`--hours`");
		expect(() => parseArgs(["--all"])).toThrow("`--all`");
	});
});
