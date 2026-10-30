// The comparison is pure, so every case here plants a reading rather than spawning `claude`. The
// three real rows are checked for the arm and settings they name, which is what makes a reading
// comparable with the recorded figure, and not for their figures, which the capture reads.

import { describe, expect, test } from "bun:test";
import {
	SHIPPED_TOTAL,
	shippedChars,
} from "../../../plugins/claudetto/src/cuts.ts";
import {
	BASELINE_TOTAL,
	DENIED_TOGETHER_TOTAL,
} from "../../../plugins/claudetto/src/deny.ts";
import { inventoryFaults, rows, VARIANCE_CHARS } from "../inventory.ts";

/** The settings text of the named row, which every row but the baseline carries. */
const byRow = (name: string): string => {
	const settings = rows().find((row) => row.name === name)?.settings;
	if (settings === undefined) {
		throw new Error(`no settings for the row ${name}`);
	}
	return settings;
};

describe("a row against its reading", () => {
	test("passes a row the capture reproduced exactly", () => {
		const faults = inventoryFaults([
			{ name: "shipped", recorded: 30_450, read: 30_450 },
		]);

		expect(faults).toEqual([]);
	});

	test("passes a row that moved by the variance and no further", () => {
		const under = inventoryFaults([
			{ name: "shipped", recorded: 30_450, read: 30_450 - VARIANCE_CHARS },
		]);
		const over = inventoryFaults([
			{ name: "shipped", recorded: 30_450, read: 30_450 + VARIANCE_CHARS },
		]);

		expect(under).toEqual([]);
		expect(over).toEqual([]);
	});

	test("refuses a row that moved past the variance, naming both figures", () => {
		const faults = inventoryFaults([
			{ name: "shipped", recorded: 30_450, read: 30_463 },
		]);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("shipped");
		expect(faults[0]).toContain("recorded 30450");
		expect(faults[0]).toContain("read 30463");
		expect(faults[0]).toContain("off by 13");
	});

	test("names the drift this check was built for, 1382 characters", () => {
		const faults = inventoryFaults([
			{ name: "shipped", recorded: 30_450, read: 30_450 - 1382 },
		]);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("off by -1382");
	});

	test("refuses a row the arm sent no request for, rather than reading it as zero", () => {
		const faults = inventoryFaults([
			{ name: "baseline", recorded: 42_687, read: undefined },
		]);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("read nothing");
	});

	test("reports one line per failing row and stays quiet about the rest", () => {
		const faults = inventoryFaults([
			{ name: "baseline", recorded: 100, read: 100 },
			{ name: "deny list", recorded: 100, read: 200 },
			{ name: "shipped", recorded: 100, read: 50 },
		]);

		expect(faults).toHaveLength(2);
		expect(faults.map((line) => line.split(":")[0])).toEqual([
			"deny list",
			"shipped",
		]);
	});

	test("takes a variance of its own, so the instrument can be re-measured", () => {
		const checked = [{ name: "shipped", recorded: 100, read: 120 }];

		expect(inventoryFaults(checked, 20)).toEqual([]);
		expect(inventoryFaults(checked, 19)).toHaveLength(1);
	});
});

describe("the rows the capture reads", () => {
	test("reads the three whole-request totals the tree records", () => {
		expect(rows().map((row) => [row.name, row.recorded])).toEqual([
			["baseline", BASELINE_TOTAL],
			["deny list", DENIED_TOGETHER_TOTAL],
			["shipped", SHIPPED_TOTAL],
		]);
	});

	test("runs the baseline on the defaults and the plugin only for the shipped row", () => {
		const byName = new Map(rows().map((row) => [row.name, row]));

		expect(byName.get("baseline")?.arm).toBe("plain");
		expect(byName.get("baseline")?.settings).toBeUndefined();
		expect(byName.get("deny list")?.arm).toBe("plain");
		expect(byName.get("shipped")?.arm).toBe("plugin");
	});

	test("the deny row carries the list the plugin ships, so no name can drift out", () => {
		const settings = byRow("deny list");

		expect(JSON.parse(settings).permissions.deny).toEqual([
			"Workflow",
			"ScheduleWakeup",
			"ReportFindings",
		]);
	});

	test("the shipped row carries the main agent and the style, which the reading pays for", () => {
		const settings = JSON.parse(byRow("shipped"));

		expect(settings.agent).toBe("claudetto:main");
		expect(settings.outputStyle).toBe("claudetto:Concise");
	});

	test("the two ends of the per-cut identity are both read rows", () => {
		// `cuts.test.ts` holds `BASELINE_TOTAL - shippedChars() === SHIPPED_TOTAL`, which is sound only
		// while a reading pins each end. Both ends are rows here, so a drift in the pieces now has to
		// move one of them.
		const read = new Set(rows().map((row) => row.recorded));

		expect(read.has(BASELINE_TOTAL)).toBe(true);
		expect(read.has(SHIPPED_TOTAL)).toBe(true);
		expect(BASELINE_TOTAL - shippedChars()).toBe(SHIPPED_TOTAL);
	});
});
