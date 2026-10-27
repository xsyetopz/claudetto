// Lab tests of the `gate.secrets` hook (task 19.20 of change `redesign-0-4-0`): the bounds of the hashes, the confirms, and the memory of short values.
// The fakes are in `stubs/secrets.ts`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ENV_HEAD_BITS } from "../modules/gate/limits.ts";
import {
	newBudget,
	scrubHashed,
} from "../modules/gate/secrets/domain/hash-scrub.ts";
import {
	hashOf,
	newSalt,
	SALT_ID,
} from "../modules/gate/secrets/domain/hashes.ts";
import { isRecord } from "../modules/jev/domain/jev.ts";
import {
	bash,
	ENV,
	records,
	shortWarned,
	stub,
	warned,
} from "./stubs/secrets.ts";
import { byCode } from "./stubs/sort.ts";

let tick = 0;

/** A text of `size` characters from a fixed seed, so that a run repeats. */
const randomText = (seed: number, size: number): string => {
	let s = seed;
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789 ";
	return Array.from({ length: size }, () => {
		s = (Math.imul(s, 1_103_515_245) + 12_345) >>> 0;
		return chars[(s >>> 8) % chars.length];
	}).join("");
};

/** Calls until the records in `store` stop growing, because a read makes a bounded number of them. */
const settle = async (
	$: Engine,
	store: Map<string, unknown>,
	was = -1,
): Promise<void> => {
	const count = records(store).length;
	if (was >= count) {
		return;
	}
	await bash($);
	await settle($, store, count);
};

test("Confirm Bound: a result with more finds than the bound of slow confirms stays masked and adds one line", async ($: Engine, on: On) => {
	const values = Array.from({ length: 8 }, (_, i) => randomText(i + 500, 20));
	const files: Record<string, string> = {
		[`/p/${ENV}`]: values.map((v, i) => `BOUND_${i}=${v}\n`).join(""),
	};
	const store = new Map<string, unknown>();
	stub(on, files, values.join(" "), { store });
	await settle($, store);
	delete files[`/p/${ENV}`];
	const answer = await bash($);
	expect(answer.result).toBe(
		values.map((_, i) => `[value of BOUND_${i}]`).join(" "),
	);
	expect(answer.context?.length).toBe(1);
});

test("Doubled Head: a false find before a real value, with no confirm left, still hides the whole value", async ($: Engine, on: On) => {
	const [decoy, value] = ["decoy9876543210abcdef", "dbl-abcd1234wxyz5678"];
	const files: Record<string, string> = {
		[`/p/${ENV}`]: `DECOY_KEY=${decoy}\nDOUBLE_KEY=${value}\n`,
	};
	const head = value.slice(0, 8);
	const shown = `${decoy.slice(0, 8)}zzzzzzzzzzzz ${head}${value}`;
	const store = new Map<string, unknown>();
	stub(on, files, shown, { store });
	await settle($, store);
	delete files[`/p/${ENV}`];
	const answer = await bash($);
	expect(answer.result).toBe(
		`${decoy.slice(0, 8)}zzzzzzzzzzzz [value of DOUBLE_KEY]`,
	);
});

test(
	"Speed: a result of 30,000 characters of varied text with 200 records is cleaned with no cut line and one slow check",
	{ timeoutMs: 120_000 },
	async ($: Engine, on: On) => {
		const files: Record<string, string> = {
			[`/p/${ENV}`]: Array.from(
				{ length: 80 },
				(_, i) => `SPEED_${i}=${randomText(i + 1, 20)}\n`,
			).join(""),
		};
		const planted = randomText(1, 20);
		const base = randomText(99_991, 30_000);
		const text = `${base.slice(0, 15_000)}${planted}${base.slice(15_020)}`;
		const sets: string[] = [];
		class Counted extends Map<string, unknown> {
			override set(key: string, value: unknown) {
				sets.push(key);
				return super.set(key, value);
			}
		}
		const store = new Counted();
		const reads = stub(on, files, text, { store });
		await settle($, store);
		delete files[`/p/${ENV}`];
		const setsBefore = sets.length;
		const readsBefore = reads.length;
		const answer = await bash($);
		expect(records(store).length).toBeGreaterThanOrEqual(200);
		expect(JSON.stringify(answer.result)).toContain("[value of SPEED_0]");
		expect(JSON.stringify(answer.result)).not.toContain(planted);
		expect(answer.context).toBeUndefined();
		// The call hashes no value again: it writes no record and reads no file.
		expect(
			sets.slice(setsBefore).filter((k) => k === "envHashes"),
		).toStrictEqual([]);
		expect(reads.length - readsBefore).toBe(0);
		// The slow checks are counted on the same filter, because a lab test cannot see inside the mod.
		const salt = newSalt();
		const known: Parameters<typeof scrubHashed>[1] = {
			[SALT_ID]: { key: salt, len: 0, head: ENV_HEAD_BITS },
		};
		for (let i = 0; i < 200; i++) {
			const [hash, record] = hashOf(salt, `SPEED_${i}`, randomText(i + 1, 20));
			known[hash] = record;
		}
		const budget = newBudget(known);
		scrubHashed(text, known, budget);
		expect(budget.isCut).toBe(false);
		expect(budget.seen.size).toBe(1);
	},
);

test(
	"Unsaved Hashes: a write that keeps missing hashes the values once, and the next call only tries the write again",
	{ timeoutMs: 120_000 },
	async ($: Engine, on: On) => {
		const written: unknown[] = [];
		const store = new Map<string, unknown>();
		stub(
			on,
			{
				[`/p/${ENV}`]: Array.from(
					{ length: 6 },
					(_, i) => `MISS_${i}=missing-value-${i}-xxxx\n`,
				).join(""),
			},
			"x",
			{
				store,
				state: (o) => {
					o("state.get", () => ({ value: { value: undefined, version: 0 } }));
					o("state.set", (_$, e) => {
						if (e.key === "envHashes") {
							written.push(e.value);
						}
						return { value: { isSet: false, version: 1 } };
					});
				},
			},
		);
		await bash($);
		const firstWrites = written.length;
		await bash($);
		const secondWrites = written.length - firstWrites;
		const keysOf = (w: unknown) =>
			Object.keys(isRecord(w) ? w : {}).sort(byCode);
		const salts = written.map((w) => {
			const salt = isRecord(w) ? w[SALT_ID] : undefined;
			return isRecord(salt) ? salt["key"] : undefined;
		});
		expect(written.length).toBeGreaterThan(5);
		expect(new Set(salts).size).toBe(1);
		// The second call tries the same records again and makes no new one.
		expect(secondWrites).toBeGreaterThan(0);
		expect(keysOf(written.at(-1))).toStrictEqual(
			keysOf(written[firstWrites - 1]),
		);
	},
);

/** A project with 520 short values, which are more than the bound of the memory. */
const manyShorts = (): Record<string, string> => ({
	[`/p/${ENV}`]: Array.from(
		{ length: 520 },
		(_, i) => `SECRET_${i}=s3c${String(i).padStart(4, "0")}x\n`,
	).join(""),
});

test("Short Values Bound: a project with more short values than the bound of the memory adds the line that a short value may show after its file is gone", async ($: Engine, on: On) => {
	const files = manyShorts();
	stub(on, files, "x");
	const answer = await bash($);
	expect(shortWarned(answer.context).length).toBe(1);
});

test("Short Values Pruned: values that an edit removed from a file that exists do not fill the memory", async ($: Engine, on: On) => {
	const files: Record<string, string> = {};
	stub(on, files, "x", { mtime: () => ++tick });
	await Array.fromAsync({ length: 6 }, async (_round, round) => {
		files[`/p/${ENV}`] = Array.from(
			{ length: 100 },
			(_, i) => `SECRET_${i}=s3c${round}${String(i).padStart(3, "0")}x\n`,
		).join("");
		await bash($);
	});
	const answer = await bash($);
	expect(shortWarned(answer.context)).toStrictEqual([]);
});

test("Short Values Kept: a value of a file that is gone stays masked, and the line names the time after a file is gone", async ($: Engine, on: On) => {
	const files = manyShorts();
	stub(on, files, "has s3c0001x here");
	const full = await bash($);
	delete files[`/p/${ENV}`];
	expect((await bash($)).result).toBe("has [value of SECRET_1] here");
	expect(shortWarned(full.context)).toHaveLength(1);
});

test(
	"Values Bound: a project with more values than the bound of records adds the line that some env files are not masked",
	{ timeoutMs: 120_000 },
	async ($: Engine, on: On) => {
		const files: Record<string, string> = {
			[`/p/${ENV}`]: Array.from(
				{ length: 520 },
				(_, i) => `V${i}=value-number-${i}-xxxx\n`,
			).join(""),
		};
		const store = new Map<string, unknown>();
		stub(on, files, "x", { store });
		await settle($, store);
		expect(warned((await bash($)).context).length).toBe(1);
	},
);
