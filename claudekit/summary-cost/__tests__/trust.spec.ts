import { describe, expect, test } from "bun:test";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { trust, untrust, withoutTrust, withTrust } from "../trust.ts";

const DIR = "/private/tmp/claudetto-summary-round/base-1";
const OTHER = "/Users/someone/work";

interface Project {
	hasTrustDialogAccepted?: boolean;
	lastCost?: number;
}

interface Config {
	projects?: Record<string, Project | undefined>;
	numStartups?: number;
}

const config = JSON.stringify({
	numStartups: 412,
	projects: { [OTHER]: { hasTrustDialogAccepted: true, lastCost: 0.42 } },
});

const read = (text: string): Config => JSON.parse(text);

describe("withTrust", () => {
	test("trusts the folder of the arm, so no dialog blocks the session", () => {
		const after = read(withTrust(config, DIR));

		expect(after.projects?.[DIR]?.hasTrustDialogAccepted).toBe(true);
	});

	test("keeps every other project and every other top-level key", () => {
		const after = read(withTrust(config, DIR));

		expect(after.projects?.[OTHER]?.lastCost).toBe(0.42);
		expect(after.numStartups).toBe(412);
	});

	test("keeps the rest of an entry the folder already has", () => {
		const already = JSON.stringify({
			projects: { [DIR]: { hasTrustDialogAccepted: false, lastCost: 1.5 } },
		});

		const after = read(withTrust(already, DIR));

		expect(after.projects?.[DIR]?.hasTrustDialogAccepted).toBe(true);
		expect(after.projects?.[DIR]?.lastCost).toBe(1.5);
	});

	test("a missing or broken config still yields a config the session can read", () => {
		const after = read(withTrust("", DIR));

		expect(after.projects?.[DIR]?.hasTrustDialogAccepted).toBe(true);
	});
});

describe("withoutTrust", () => {
	test("drops the entry of the arm and leaves the other projects alone", () => {
		const after = read(withoutTrust(withTrust(config, DIR), DIR));

		expect(after.projects?.[DIR]).toBeUndefined();
		expect(after.projects?.[OTHER]?.hasTrustDialogAccepted).toBe(true);
	});

	// A round that is stopped mid-arm cannot clean up that arm, so the sweep takes the whole folder.
	test("drops every arm inside a folder of a round", () => {
		const round = "/private/tmp/claudetto-summary-round";
		const trusted = withTrust(withTrust(config, DIR), `${round}/guard-2`);

		const after = read(withoutTrust(trusted, round));

		expect(after.projects?.[DIR]).toBeUndefined();
		expect(after.projects?.[`${round}/guard-2`]).toBeUndefined();
		expect(after.projects?.[OTHER]?.hasTrustDialogAccepted).toBe(true);
	});
});

describe("trust and untrust", () => {
	test("write the file, so the round leaves the config as it found it", async () => {
		const file = join(tmpdir(), `trust-${process.pid}-${Math.random()}.json`);
		await writeFile(file, config);

		await trust(file, DIR);
		const during = read(await readFile(file, "utf8"));
		await untrust(file, DIR);
		const after = read(await readFile(file, "utf8"));
		await rm(file, { force: true });

		expect(during.projects?.[DIR]?.hasTrustDialogAccepted).toBe(true);
		expect(after).toEqual(read(config));
	});
});
