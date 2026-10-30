import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { silentFaults } from "../../../tools/rebuild/silent.ts";
import { shippedSources } from "../../../tools/source-text.ts";

const FILE = { path: "src/x.ts" } as const;

describe("a telemetry noun in the code", () => {
	test("is a fault, whatever its case", () => {
		const text = `const a = 1;
$.Telemetry.log(entry);`;

		expect(silentFaults({ ...FILE, text })).toStrictEqual([
			'src/x.ts:2: holds the telemetry noun "Telemetry", and the rebuild keeps none',
		]);
	});

	test("is a fault when it sits in a string, such as an event name", () => {
		const text = 'const e = "tengu_jolly_dewdrop";';

		expect(silentFaults({ ...FILE, text })).toHaveLength(1);
	});

	test("is no fault in a comment, where the code explains what it dropped", () => {
		const text = `// telemetry.log and telemetry.mark are dropped
const a = 1;`;

		expect(silentFaults({ ...FILE, text })).toStrictEqual([]);
	});
});

describe("a network call in the code", () => {
	test("is a fault for a fetch", () => {
		const text = "const r = await fetch(url);";

		expect(silentFaults({ ...FILE, text })).toHaveLength(1);
	});

	test("is a fault for a URL in a string", () => {
		const text = 'const u = "https://example.test/batch";';

		expect(silentFaults({ ...FILE, text })).toHaveLength(1);
	});

	test("is a fault for a socket", () => {
		const text = "const w = new WebSocket(address);";

		expect(silentFaults({ ...FILE, text })).toHaveLength(1);
	});

	test("is no fault for the one model request of a check", () => {
		const text = "const r = await $.model.complete(request);";

		expect(silentFaults({ ...FILE, text })).toStrictEqual([]);
	});
});

describe("the shipped plugin", () => {
	test("holds no telemetry noun and no network call", async () => {
		const files = await shippedSources(join(import.meta.dir, "..", "..", ".."));

		const faults = files.flatMap((file) => silentFaults(file));

		expect(files.length).toBeGreaterThan(0);
		expect(faults).toStrictEqual([]);
	});
});
