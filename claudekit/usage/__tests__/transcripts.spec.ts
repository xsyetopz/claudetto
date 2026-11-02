import { describe, expect, test } from "bun:test";
import {
	callOf,
	DEFAULT_ROOT,
	parseOptions,
	readEntries,
	transcriptFiles,
	transcripts,
} from "../transcripts.ts";
import { assistant, makeRoot, userText, writeTranscript } from "./fixture.ts";

describe("parseOptions", () => {
	test("reads the week from `--since` and `--until`", async () => {
		const options = parseOptions([
			"--since",
			"2026-10-27",
			"--until",
			"2026-11-03",
			"--root",
			"/data",
		]);

		expect(options).toEqual({
			root: "/data",
			window: {
				since: Date.parse("2026-10-27"),
				until: Date.parse("2026-11-03"),
			},
		});
	});

	test("defaults the root to `~/.claude/projects` and leaves the week open at the end", async () => {
		const options = parseOptions(["--since", "2026-10-27"]);

		expect(options.root).toBe(DEFAULT_ROOT);
		expect(DEFAULT_ROOT.endsWith("/.claude/projects")).toBe(true);
		expect(options.window.until).toBe(Number.POSITIVE_INFINITY);
	});

	test("rejects a missing or unparsable `--since`", async () => {
		expect(() => parseOptions([])).toThrow("--since");
		expect(() => parseOptions(["--since", "soon"])).toThrow("--since");
	});
});

describe("transcriptFiles", () => {
	test("lists `.jsonl` files and leaves out subagent files on request", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/a.jsonl", ["{}"]);
		await writeTranscript(root, "p/a/subagents/b.jsonl", ["{}"]);
		await writeTranscript(root, "p/notes.txt", ["x"]);

		const all = (await transcriptFiles(root, 0, true)).map((f) =>
			f.slice(root.length),
		);
		const main = (await transcriptFiles(root, 0, false)).map((f) =>
			f.slice(root.length),
		);

		expect(all.sort((a, b) => a.localeCompare(b))).toEqual([
			"/p/a.jsonl",
			"/p/a/subagents/b.jsonl",
		]);
		expect(main).toEqual(["/p/a.jsonl"]);
	});

	test("skips files last written before the start of the week", async () => {
		const root = await makeRoot();
		await writeTranscript(root, "p/a.jsonl", ["{}"]);

		expect(await transcriptFiles(root, Date.now() + 60_000, true)).toEqual([]);
	});
});

describe("readEntries", () => {
	test("skips blank and broken lines and lines without the needle", async () => {
		const root = await makeRoot();
		const path = await writeTranscript(root, "p/a.jsonl", [
			"",
			"{broken",
			userText("hello"),
			assistant({ id: "m1", at: "2026-10-27T01:00:00Z" }),
		]);

		expect(await readEntries(path)).toHaveLength(2);
		expect(await readEntries(path, '"usage"')).toHaveLength(1);
	});
});

describe("callOf", () => {
	test("reads the four token counts and the prompt total", async () => {
		const [entry] = await readEntries(
			await writeTranscript(await makeRoot(), "p/a.jsonl", [
				assistant({
					id: "m1",
					at: "2026-10-27T01:00:00Z",
					input: 1,
					output: 2,
					read: 30,
					write: 4,
				}),
			]),
		);

		expect(callOf(entry ?? {})).toMatchObject({
			key: "m1:req_m1",
			input: 1,
			output: 2,
			read: 30,
			write: 4,
			prompt: 35,
			sidechain: false,
		});
	});

	test("returns nothing for an entry without usage or a timestamp", async () => {
		expect(callOf({ type: "user", message: { content: "x" } })).toBeUndefined();
		expect(
			callOf({ type: "assistant", message: { usage: {} } }),
		).toBeUndefined();
	});
});

describe("transcripts", () => {
	test("hands over more files than it reads ahead, in path order", async () => {
		const root = await makeRoot();
		const names = Array.from(
			{ length: 40 },
			(_, i) => `p/${String(i).padStart(2, "0")}.jsonl`,
		);
		await Promise.all(
			names.map((name) => writeTranscript(root, name, [userText(name)])),
		);

		const paths: string[] = [];
		for await (const { path, entries } of transcripts(
			await transcriptFiles(root, 0, true),
		)) {
			paths.push(path.slice(root.length + 1));
			expect(entries).toHaveLength(1);
		}

		expect(paths).toEqual(names);
	});
});
