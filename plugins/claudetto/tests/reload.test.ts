// Lab tests of the `gate.secrets` hook (task 19.20 of change `redesign-0-4-0`): a value that an env file held stays replaced after the file is gone, and the state holds no value.
// The fakes are in `stubs/secrets.ts`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	bash,
	ENV,
	PASS,
	racing,
	records,
	stub,
	TOKEN,
} from "./stubs/secrets.ts";

test("Reload: a value that the filter saw stays replaced with the file gone, and the state holds no value", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]: `API_TOKEN=${TOKEN}\nDB_PASSWORD=admin1\n`,
	};
	const store = new Map<string, unknown>();
	stub(on, files, `${TOKEN} admin1 ${btoa(TOKEN)}`, { store });
	await bash($);
	delete files[`/p/${ENV}`];
	const kept = JSON.stringify([...store]);
	expect(kept).not.toContain(TOKEN);
	expect(kept).not.toContain("admin1");
	expect((await bash($)).result).toBe(
		"[value of API_TOKEN] [value of DB_PASSWORD] [value of API_TOKEN]",
	);
});

/** A short value that the filter saw stays replaced when the next read of its file fails after a new modification time. */
const failedRead = async (
	$: Engine,
	on: On,
	failed: string,
): Promise<unknown> => {
	const files = { [`/p/${ENV}`]: "SHORT_PASS=hunt3r\n" };
	let time = 1;
	let reason: string | undefined;
	stub(on, files, "login hunt3r now", {
		mtime: () => time,
		failure: () => reason,
	});
	await bash($);
	time = 2;
	reason = failed;
	return (await bash($)).result;
};

test("Unreadable File: a short value stays replaced when a touched file can no longer be read", async ($: Engine, on: On) => {
	expect(await failedRead($, on, "EACCES")).toBe(
		"login [value of SHORT_PASS] now",
	);
});

test("Gone At Read: a short value stays replaced when the file is gone between `stat` and `read`", async ($: Engine, on: On) => {
	expect(await failedRead($, on, "ENOENT")).toBe(
		"login [value of SHORT_PASS] now",
	);
});

test("Short Value: a value of 6 characters has no record in the state, and the same mod still replaces it", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]: `SHORT_PASS=hunt3r\nAPI_TOKEN=${TOKEN}\n`,
	};
	const store = new Map<string, unknown>();
	stub(on, files, "login hunt3r now", { store });
	await bash($);
	delete files[`/p/${ENV}`];
	const answer = await bash($);
	expect(records(store).filter((r) => r.key === "SHORT_PASS")).toStrictEqual(
		[],
	);
	expect(answer.result).toBe("login [value of SHORT_PASS] now");
});

test("Long Value Reload: a value of 20 characters is replaced from the state alone, with the file gone", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n`,
	};
	const store = new Map<string, unknown>();
	stub(on, files, `t ${TOKEN}`, { store });
	await bash($);
	delete files[`/p/${ENV}`];
	expect(records(store).some((r) => r.key === "API_TOKEN")).toBe(true);
	expect((await bash($)).result).toBe("t [value of API_TOKEN]");
});

test("Parallel Write: a write that misses is read again and merged, so the record of the other call stays and the value is replaced with the file gone", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n`,
	};
	const other = { ["a".repeat(64)]: { key: "OTHER_KEY", len: 20, head: 1 } };
	const store = new Map<string, unknown>();
	stub(on, files, `t ${TOKEN}`, { store, state: racing(other) });
	await bash($);
	delete files[`/p/${ENV}`];
	const answer = await bash($);
	expect(records(store).map((r) => r.key)).toContain("OTHER_KEY");
	expect(records(store).map((r) => r.key)).toContain("API_TOKEN");
	expect(answer.result).toBe("t [value of API_TOKEN]");
});

test("Head Bits: the stored head of a value is below 2^32, and not cut to 20 bits", async ($: Engine, on: On) => {
	const store = new Map<string, unknown>();
	stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\nDB_PASS=${PASS}\n` }, "x", {
		store,
	});
	await bash($);
	const heads = records(store).flatMap((r) =>
		r.len !== undefined && r.len > 0 && r.head !== undefined ? [r.head] : [],
	);
	expect(heads.length).toBeGreaterThan(0);
	expect(heads.every((h) => h < 2 ** 32)).toBe(true);
	expect(heads.some((h) => h >= 2 ** 20)).toBe(true);
});

test("Old Head: records of an older reload with a 20-bit head are dropped, and the value is recorded again", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n`,
	};
	const old = {
		salt: { key: "0".repeat(32), len: 0, head: 0 },
		["b".repeat(64)]: { key: "OLD_KEY", len: 20, head: 7 },
	};
	const store = new Map<string, unknown>([["envHashes", old]]);
	stub(on, files, `t ${TOKEN}`, { store });
	await bash($);
	delete files[`/p/${ENV}`];
	const answer = await bash($);
	expect(records(store).map((r) => r.key)).not.toContain("OLD_KEY");
	expect(answer.result).toBe("t [value of API_TOKEN]");
});

test("Gone In Call: a value that the call prints and removes with its file stays replaced, also past the records of one read", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]: Array.from(
			{ length: 8 },
			(_, i) => `CALL_${i}=call-value-${i}-xxxxxxxx\n`,
		).join(""),
	};
	stub(on, files, "printed call-value-7-xxxxxxxx", {
		act: () => {
			delete files[`/p/${ENV}`];
		},
	});
	expect((await bash($)).result).toBe("printed [value of CALL_7]");
});

test("Plain Pairs: pairs that are never masked do not fill the memory of short values", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]: `${Array.from({ length: 600 }, (_, i) => `N${i}=1\n`).join("")}PASS_Q=zq9x\n`,
	};
	stub(on, files, "login zq9x now");
	await bash($);
	delete files[`/p/${ENV}`];
	expect((await bash($)).result).toBe("login [value of PASS_Q] now");
});

test("Short Lines: a short line of a long multiline value stays replaced with the file gone", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		[`/p/${ENV}`]:
			'MULTI_KEY="-----BEGIN KEY-----\ns3cr3t7\n-----END KEY-----"\n',
	};
	stub(on, files, "line s3cr3t7 end");
	await bash($);
	delete files[`/p/${ENV}`];
	expect((await bash($)).result).toBe("line [value of MULTI_KEY] end");
});
